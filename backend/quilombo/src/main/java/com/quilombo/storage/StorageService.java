package com.quilombo.storage;

/**
 * Abstração de armazenamento de objetos (S3-compatível). Em dev é o MinIO; em
 * produção, qualquer S3/R2 — a troca é só de configuração. Quem consome (a
 * biblioteca de mídia) não conhece o provedor.
 */
public interface StorageService {

    /** Grava um objeto sob a chave dada (sobrescreve se já existir). */
    void put(String key, byte[] content, String contentType);

    /** Remove o objeto da chave dada (idempotente no S3). */
    void delete(String key);

    /** URL pública do objeto: base pública configurada + chave. */
    String publicUrl(String key);
}
