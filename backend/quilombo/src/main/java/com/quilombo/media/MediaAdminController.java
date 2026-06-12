package com.quilombo.media;

import com.quilombo.common.api.ApiResponse;
import com.quilombo.media.dto.AltTextRequest;
import com.quilombo.media.dto.ImageResponse;
import com.quilombo.media.dto.StorageUsageResponse;
import com.quilombo.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Acervo de imagens da comunidade ({@code /api/v1/admin}): listar, enviar (com
 * processamento e quota), editar texto alternativo, remover (bloqueado se em uso)
 * e consultar a quota. Bearer do tenant exigido em todas, com a allowlist
 * revalidada no banco. Rotas espelham o MVP ({@code /images}, {@code /upload},
 * {@code /storage}).
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class MediaAdminController {

    private final MediaAdminService mediaService;

    @GetMapping("/images")
    public ApiResponse<List<ImageResponse>> list(
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(mediaService.list(principal));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ImageResponse> upload(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "altText", required = false) String altText) {
        return ApiResponse.ok(mediaService.upload(principal, file, altText));
    }

    @PutMapping("/images/{filename}/alt")
    public ApiResponse<ImageResponse> updateAltText(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String filename,
            @RequestBody AltTextRequest request) {
        return ApiResponse.ok(mediaService.updateAltText(principal, filename, request.altText()));
    }

    @DeleteMapping("/images/{filename}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String filename) {
        mediaService.delete(principal, filename);
        return ApiResponse.ok(null);
    }

    @GetMapping("/storage")
    public ApiResponse<StorageUsageResponse> usage(
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(mediaService.usage(principal));
    }
}
