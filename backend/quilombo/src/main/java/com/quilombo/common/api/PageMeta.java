package com.quilombo.common.api;

/**
 * Metadados de paginação. Campos espelham o {@code PagedModel} nativo do Spring Data
 * ({@code size}, {@code number}, {@code totalElements}, {@code totalPages}).
 */
public record PageMeta(int size, int number, long totalElements, int totalPages) {}
