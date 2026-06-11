package com.quilombo.config;

import com.quilombo.security.JwtAuthenticationFilter;
import com.quilombo.security.OAuth2AuthenticationSuccessHandler;
import com.quilombo.security.RestAccessDeniedHandler;
import com.quilombo.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final AppProperties appProperties;

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
                "https://*." + appProperties.baseDomain(),
                "https://" + appProperties.baseDomain(),
                "http://localhost:[*]",
                "http://127.0.0.1:[*]"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

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

    /**
     * Dev libera tudo (Swagger, Actuator, endpoints sem token), mas mantém o fluxo
     * de login real funcional: oauth2Login registra os endpoints do handshake com o
     * Google e o filtro JWT autentica Bearer quando presente — sem eles, o login só
     * funcionaria em prod e o /auth/me seria intestável no navegador.
     */
    @Bean
    @Profile("dev")
    SecurityFilterChain devFilterChain(HttpSecurity http,
                                       JwtAuthenticationFilter jwtFilter,
                                       OAuth2AuthenticationSuccessHandler successHandler) throws Exception {
        return http
                .cors(withDefaults())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .oauth2Login(oauth2 -> oauth2.successHandler(successHandler))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .csrf(csrf -> csrf.disable())
                .build();
    }

    @Bean
    @Profile("homolog")
    SecurityFilterChain homologFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(withDefaults())
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
                                        OAuth2AuthenticationSuccessHandler successHandler,
                                        RestAuthenticationEntryPoint authenticationEntryPoint,
                                        RestAccessDeniedHandler accessDeniedHandler) throws Exception {
        return http
                .cors(withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/oauth2/**", "/login/oauth2/**").permitAll()
                        // troca/refresh/logout autenticam pelo código ou cookie — sem Bearer
                        .requestMatchers("/api/v1/auth/token", "/api/v1/auth/refresh",
                                "/api/v1/auth/logout").permitAll()
                        .anyRequest().authenticated())
                // 401/403 da security chain em RFC 7807, como o resto da API
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                // OAuth2 precisa de sessão para armazenar o state/nonce do PKCE durante o handshake.
                // O JWT assume após o redirecionamento do successHandler.
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .oauth2Login(oauth2 -> oauth2.successHandler(successHandler))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .csrf(csrf -> csrf.disable())
                .build();
    }
}
