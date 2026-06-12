package com.quilombo.media.dto;

import com.quilombo.media.StorageObject;

import java.time.Instant;

/**
 * Item do acervo exposto pelo {@code /admin/images}. {@code url} é a URL pública
 * do objeto no storage; {@code inUse} indica se alguma seção ou o card referencia
 * a imagem (bloqueia a remoção).
 */
public record ImageResponse(
        String filename,
        String url,
        long sizeBytes,
        double sizeKb,
        String altText,
        Instant createdAt,
        boolean inUse) {

    public static ImageResponse from(StorageObject object, String url, boolean inUse) {
        return new ImageResponse(
                object.getFilename(),
                url,
                object.getSizeBytes(),
                round1(object.getSizeBytes() / 1024.0),
                object.getAltText(),
                object.getCreatedAt(),
                inUse);
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
