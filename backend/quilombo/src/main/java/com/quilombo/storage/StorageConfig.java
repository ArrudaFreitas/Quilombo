package com.quilombo.storage;

import com.quilombo.config.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AnonymousCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

/**
 * Cliente S3 (MinIO em dev, S3/R2 em prod) montado a partir do {@code app.storage}.
 * Sem credenciais (Maven local/teste sem storage) usa credenciais anônimas — o
 * contexto sobe e o cliente só é exercido de fato quando configurado.
 * {@code forcePathStyle} é exigido por MinIO/R2.
 */
@Configuration
public class StorageConfig {

    @Bean
    S3Client s3Client(AppProperties properties) {
        var storage = properties.storage();
        AwsCredentialsProvider credentials =
                isBlank(storage.accessKey()) || isBlank(storage.secretKey())
                        ? AnonymousCredentialsProvider.create()
                        : StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(storage.accessKey(), storage.secretKey()));

        var builder = S3Client.builder()
                .region(Region.of(storage.region()))
                .credentialsProvider(credentials)
                .forcePathStyle(true);
        if (!isBlank(storage.endpoint())) {
            builder.endpointOverride(URI.create(storage.endpoint()));
        }
        return builder.build();
    }

    @Bean
    StorageService storageService(S3Client s3Client, AppProperties properties) {
        var storage = properties.storage();
        return new S3StorageService(s3Client, storage.bucket(), storage.publicBaseUrl());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
