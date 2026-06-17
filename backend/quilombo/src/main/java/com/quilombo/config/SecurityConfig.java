package com.quilombo.config;

import com.quilombo.security.JwtAuthenticationFilter;
import com.quilombo.security.RestAccessDeniedHandler;
import com.quilombo.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
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
                // Subdomínios (uma origem por comunidade) e o ápice. O sufixo ":[*]" torna a
                // porta OPCIONAL no match (regex `(:\d+)?`): cobre prod (origem sem porta, 443)
                // e dev (origem com :8080). Necessário porque o nginx termina o TLS e encaminha
                // HTTP ao backend, então o Spring vê o request como cross-origin e valida o
                // header Origin do browser — que em dev carrega a porta. Sem o ":[*]" no domínio
                // base, todo POST same-origin (login/refresh/logout) é recusado com 403
                // "Invalid CORS request".
                "https://*." + appProperties.baseDomain() + ":[*]",
                "https://" + appProperties.baseDomain() + ":[*]",
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
     * Dev libera tudo (Swagger, Actuator, endpoints sem token), mas mantém o login real
     * funcional: o filtro JWT autentica o Bearer quando presente — sem ele o /auth/me seria
     * intestável no navegador. O login agora é o POST /auth/google (idToken), sem handshake.
     */
    @Bean
    @Profile("dev")
    SecurityFilterChain devFilterChain(HttpSecurity http,
                                       JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
                .cors(withDefaults())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
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
                                        RestAuthenticationEntryPoint authenticationEntryPoint,
                                        RestAccessDeniedHandler accessDeniedHandler) throws Exception {
        return http
                .cors(withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        // login/refresh/logout autenticam pelo idToken ou cookie — sem Bearer
                        .requestMatchers("/api/v1/auth/google", "/api/v1/auth/refresh",
                                "/api/v1/auth/logout").permitAll()
                        // diretório e página institucional públicos — não exigem login
                        .requestMatchers(HttpMethod.GET, "/api/v1/communities",
                                "/api/v1/community").permitAll()
                        .anyRequest().authenticated())
                // 401/403 da security chain em RFC 7807, como o resto da API
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                // Sem handshake OAuth: API puramente por token (JWT Bearer + cookie de refresh).
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .csrf(csrf -> csrf.disable())
                .build();
    }
}
