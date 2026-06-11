package com.quilombo.media;

import com.quilombo.auth.AdminSessionService;
import com.quilombo.auth.InvalidSessionException;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityProfile;
import com.quilombo.community.CommunityProfileRepository;
import com.quilombo.community.CommunityRepository;
import com.quilombo.config.AppProperties;
import com.quilombo.media.dto.ImageResponse;
import com.quilombo.media.dto.StorageUsageResponse;
import com.quilombo.page.PageSection;
import com.quilombo.page.PageSectionRepository;
import com.quilombo.security.JwtPrincipal;
import com.quilombo.storage.StorageService;
import com.quilombo.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Acervo de imagens da comunidade autenticada — upload (resize + WebP via
 * {@link ImagePipeline}), listagem com flag de uso, edição de texto alternativo,
 * remoção e quota. Toda operação é tenant-scoped: {@code @TenantId} + RLS isolam
 * as linhas de {@code storage_usage}, e o object storage usa o filename (único
 * por incluir o slug) como chave. Único caminho de escrita do acervo, como no MVP.
 */
@Service
@RequiredArgsConstructor
public class MediaAdminService {

    private final AdminSessionService adminSession;
    private final StorageObjectRepository objects;
    private final CommunityRepository communities;
    private final CommunityProfileRepository profiles;
    private final PageSectionRepository sections;
    private final StorageService storage;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ImageResponse> list(JwtPrincipal principal) {
        adminSession.requireAdmin(principal);
        var referenced = referencedContent();
        return objects.findAllByOrderByCreatedAtDesc().stream()
                .map(object -> ImageResponse.from(
                        object,
                        storage.publicUrl(object.getFilename()),
                        referenced.contains(object.getFilename())))
                .toList();
    }

    @Transactional
    public ImageResponse upload(JwtPrincipal principal, MultipartFile file, String altText) {
        adminSession.requireAdmin(principal);
        var community = currentCommunity();
        var storageProps = properties.storage();

        var alt = requireAltText(altText);

        var raw = readBytes(file);
        if (raw.length > storageProps.uploadMaxBytes()) {
            throw new UploadTooLargeException(storageProps.uploadMaxBytes());
        }
        if (!isImageContentType(file.getContentType())) {
            throw new InvalidImageException("Apenas imagens são permitidas");
        }

        var processed = process(raw, storageProps.imageMaxDimension());

        if (objects.sumSizeBytes() + processed.length > storageProps.limitBytes()) {
            throw new StorageLimitReachedException(storageProps.limitBytes());
        }

        var filename = newFilename(community.getSlug());
        storage.put(filename, processed, "image/webp");

        try {
            var object = new StorageObject();
            object.setFilename(filename);
            object.setSizeBytes(processed.length);
            object.setAltText(alt);
            objects.save(object);
            return ImageResponse.from(object, storage.publicUrl(filename), false);
        } catch (RuntimeException e) {
            // compensação best-effort: limpa o objeto se o INSERT falhar
            safeDelete(filename);
            throw e;
        }
    }

    @Transactional
    public ImageResponse updateAltText(JwtPrincipal principal, String filename, String altText) {
        adminSession.requireAdmin(principal);
        var alt = requireAltText(altText);

        var object = objects.findByFilename(filename)
                .orElseThrow(ImageNotFoundException::new);
        object.setAltText(alt);
        objects.save(object);

        return ImageResponse.from(
                object, storage.publicUrl(filename), referencedContent().contains(filename));
    }

    @Transactional
    public void delete(JwtPrincipal principal, String filename) {
        adminSession.requireAdmin(principal);

        var object = objects.findByFilename(filename)
                .orElseThrow(ImageNotFoundException::new);
        if (referencedContent().contains(filename)) {
            throw new ImageInUseException();
        }

        objects.delete(object);
        // a linha já saiu da quota; falhar no storage não desfaz a remoção lógica
        safeDelete(filename);
    }

    @Transactional(readOnly = true)
    public StorageUsageResponse usage(JwtPrincipal principal) {
        adminSession.requireAdmin(principal);
        return StorageUsageResponse.of(objects.sumSizeBytes(), properties.storage().limitBytes());
    }

    // ---------- helpers ----------

    /**
     * Concatena tudo que pode referenciar uma imagem no tenant — o conteúdo JSON
     * das seções e a URL do card — para um teste de "em uso" por substring do
     * filename (token único), como o {@code _is_image_in_use} do MVP.
     */
    private String referencedContent() {
        var haystack = new StringBuilder();
        for (PageSection section : sections.findAllByOrderByOrderIndexAsc()) {
            haystack.append(serialize(section.getContent()));
        }
        profiles.findTopByOrderByIdAsc()
                .map(CommunityProfile::getImageUrl)
                .ifPresent(haystack::append);
        return haystack.toString();
    }

    private String serialize(Object content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (RuntimeException e) {
            return String.valueOf(content);
        }
    }

    private static byte[] process(byte[] raw, int maxDimension) {
        try {
            return ImagePipeline.toWebp(raw, maxDimension);
        } catch (IllegalArgumentException e) {
            throw new InvalidImageException("Não foi possível processar a imagem");
        }
    }

    private static String requireAltText(String altText) {
        if (altText == null || altText.isBlank()) {
            throw new AltTextRequiredException();
        }
        return altText.strip();
    }

    private static boolean isImageContentType(String contentType) {
        return contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("image/");
    }

    private static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Falha ao ler o upload.", e);
        }
    }

    private static String newFilename(String slug) {
        var token = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return slug + "_" + token + ".webp";
    }

    private void safeDelete(String filename) {
        try {
            storage.delete(filename);
        } catch (RuntimeException ignored) {
            // swallow — orfão no storage não quebra o fluxo
        }
    }

    /** O admin só chega aqui com tenant no contexto (JWT + interceptor). */
    private Community currentCommunity() {
        return TenantContext.getCommunityId()
                .flatMap(communities::findById)
                .orElseThrow(InvalidSessionException::new);
    }
}
