package com.quilombo.tenant;

import com.quilombo.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registra o {@link TenantInterceptor} no MVC. Configuração separada de
 * {@code WebConfig} para que slices de teste ({@code @WebMvcTest}) possam importar
 * o {@code WebConfig} sem arrastar a dependência de repositório do interceptor.
 *
 * <p>{@code @EnableConfigurationProperties}: slices não aplicam o
 * {@code @ConfigurationPropertiesScan} da aplicação, mas incluem esta configuração
 * ({@code WebMvcConfigurer}) e o interceptor ({@code HandlerInterceptor}) — sem
 * isso, o {@code AppProperties} do interceptor não existiria no slice.
 */
@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(AppProperties.class)
public class TenantWebConfiguration implements WebMvcConfigurer {

    private final TenantInterceptor tenantInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor);
    }
}
