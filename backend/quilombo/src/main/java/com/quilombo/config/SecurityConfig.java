package com.quilombo.config;

import com.quilombo.security.JwtAuthenticationFilter;
import com.quilombo.security.OAuth2AuthenticationSuccessHandler;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Impede que o Spring Boot registre o JwtAuthenticationFilter como filtro de servlet
     * diretamente — ele é gerenciado exclusivamente pela security filter chain de prod.
     */
    @Bean
    FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(
            JwtAuthenticationFilter filter) {
        var registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    @Profile("dev")
    SecurityFilterChain devFilterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(csrf -> csrf.disable())
                .build();
    }

    @Bean
    @Profile("homolog")
    SecurityFilterChain homologFilterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(withDefaults())
                .sessionManagement(sm ->
                        sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .build();
    }

    @Bean
    @Profile("prod")
    SecurityFilterChain prodFilterChain(HttpSecurity http,
                                        JwtAuthenticationFilter jwtFilter,
                                        OAuth2AuthenticationSuccessHandler successHandler) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/oauth2/**", "/login/oauth2/**").permitAll()
                        .anyRequest().authenticated())
                // OAuth2 precisa de sessão para armazenar o state/nonce do PKCE durante o handshake.
                // O JWT assume após o redirecionamento do successHandler.
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .oauth2Login(oauth2 -> oauth2.successHandler(successHandler))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .csrf(csrf -> csrf.disable())
                .build();
    }
}
