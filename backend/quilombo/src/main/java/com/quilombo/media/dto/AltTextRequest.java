package com.quilombo.media.dto;

/**
 * Atualização do texto alternativo de uma imagem. O obrigatório/não-vazio é
 * validado no serviço (422), como no upload — mesmo contrato para os dois.
 */
public record AltTextRequest(String altText) {}
