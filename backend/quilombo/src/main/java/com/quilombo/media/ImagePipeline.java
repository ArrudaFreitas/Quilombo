package com.quilombo.media;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;

import java.io.IOException;
import java.io.UncheckedIOException;

/**
 * Processamento de imagem com Scrimage — redimensiona mantendo o aspect ratio
 * (sem ampliar) e codifica em WebP, o equivalente Java do pipeline Pillow do MVP.
 * Função pura, sem dependências de Spring; testável isoladamente.
 */
public final class ImagePipeline {

    private static final int WEBP_QUALITY = 80;

    private ImagePipeline() {
    }

    /**
     * Lê os bytes, limita o maior lado a {@code maxDimension} (sem ampliar imagens
     * menores) e devolve o WebP resultante. Entrada que não é imagem válida vira
     * {@link IllegalArgumentException} — o caller traduz para 400.
     */
    public static byte[] toWebp(byte[] input, int maxDimension) {
        ImmutableImage image;
        try {
            image = ImmutableImage.loader().fromBytes(input);
        } catch (IOException e) {
            throw new IllegalArgumentException("Conteúdo enviado não é uma imagem válida.", e);
        }
        try {
            return image.bound(maxDimension, maxDimension)
                    .bytes(new WebpWriter().withQ(WEBP_QUALITY));
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao codificar a imagem em WebP.", e);
        }
    }
}
