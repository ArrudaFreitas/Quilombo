package com.quilombo.media;

import com.sksamuel.scrimage.ImmutableImage;
import org.junit.jupiter.api.Test;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pipeline de imagem isolado (sem Spring): reduz o maior lado ao limite mantendo
 * o aspect ratio, não amplia imagens menores, e sempre devolve WebP. Entrada que
 * não é imagem vira {@link IllegalArgumentException}.
 */
class ImagePipelineTest {

    @Test
    void resizes_down_to_the_max_dimension_keeping_aspect_ratio() throws Exception {
        var webp = ImagePipeline.toWebp(png(4000, 2000), 1920);

        assertThat(isWebp(webp)).isTrue();
        var decoded = ImmutableImage.loader().fromBytes(webp);
        assertThat(decoded.width).isEqualTo(1920);
        assertThat(decoded.height).isEqualTo(960);
    }

    @Test
    void does_not_upscale_images_smaller_than_the_limit() throws Exception {
        var webp = ImagePipeline.toWebp(png(100, 80), 1920);

        var decoded = ImmutableImage.loader().fromBytes(webp);
        assertThat(decoded.width).isEqualTo(100);
        assertThat(decoded.height).isEqualTo(80);
    }

    @Test
    void rejects_content_that_is_not_an_image() {
        assertThatThrownBy(() -> ImagePipeline.toWebp("nem de longe um PNG".getBytes(StandardCharsets.UTF_8), 1920))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static boolean isWebp(byte[] bytes) {
        // container RIFF: "RIFF"...."WEBP"
        return bytes.length > 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
    }

    private static byte[] png(int width, int height) throws Exception {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var graphics = image.createGraphics();
        graphics.setColor(Color.BLUE);
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
