package com.quilombo;

import com.quilombo.auth.GoogleTokenVerifier;
import com.quilombo.auth.InvalidGoogleTokenException;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Postgres real para os testes de integração, com DOIS usuários no mesmo
 * container, espelhando produção:
 *
 * <ul>
 *   <li>o superusuário do container ({@code test}) é o DONO/migrador — o Flyway
 *       conecta como ele e cria schema e políticas RLS;
 *   <li>{@code quilombo_app} é a role de RUNTIME (não-dona) — a aplicação conecta
 *       como ela, para o RLS valer de verdade nos testes. Provisionada por
 *       {@code testcontainers/init-roles.sql}, antes do Flyway.
 * </ul>
 *
 * <p>Por isso não se usa {@code @ServiceConnection} (que fiaria um único usuário):
 * as propriedades são registradas à mão, separando o datasource de runtime do
 * datasource do Flyway.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"))
				.withInitScript("testcontainers/init-roles.sql");
	}

	/**
	 * Verificador do Google stubado: o build/CI não fala com o Google real. Nos ITs o
	 * "idToken" é um valor sintético — {@code "email"} ou {@code "email|nome"}. Um valor
	 * sem {@code @} simula um token inválido (assinatura/aud/iss) e resulta em 401, como
	 * a verificação real. {@code @Primary} prevalece sobre o {@code GoogleTokenVerifierImpl}.
	 */
	@Bean
	@Primary
	GoogleTokenVerifier fakeGoogleTokenVerifier() {
		return idToken -> {
			var parts = idToken.split("\\|", 2);
			var email = parts[0];
			if (!email.contains("@")) {
				throw new InvalidGoogleTokenException();
			}
			var name = parts.length > 1 ? parts[1] : "";
			return new GoogleTokenVerifier.GoogleUser(email, "google-sub:" + email, name);
		};
	}

	@Bean
	DynamicPropertyRegistrar databaseProperties(PostgreSQLContainer container) {
		return registry -> {
			// Runtime: role de app não-dona — o RLS se aplica a ela.
			registry.add("spring.datasource.url", container::getJdbcUrl);
			registry.add("spring.datasource.username", () -> "quilombo_app");
			registry.add("spring.datasource.password", () -> "quilombo_app");
			// Migração: usuário dono do container — cria schema e políticas.
			registry.add("spring.flyway.url", container::getJdbcUrl);
			registry.add("spring.flyway.user", container::getUsername);
			registry.add("spring.flyway.password", container::getPassword);
			// Os ITs controlam os próprios dados — sem seed de dev no startup.
			registry.add("app.seed.enabled", () -> "false");
		};
	}
}
