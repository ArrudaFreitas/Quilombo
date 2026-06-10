package com.quilombo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

/**
 * Configuração transversal de Web MVC.
 *
 * <ul>
 *   <li>Prefixo global {@code /api/v1} em todos os controllers do pacote da aplicação
 *       (não afeta springdoc nem actuator, que ficam fora de {@code com.quilombo}).</li>
 *   <li>{@code VIA_DTO}: caso algum endpoint retorne {@code Page} diretamente, a
 *       serialização é estável (PagedModel) em vez do formato instável do PageImpl.</li>
 * </ul>
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/api/v1", HandlerTypePredicate.forBasePackage("com.quilombo"));
    }
}
