package com.quilombo.community;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Card do diretório público — tabela desnormalizada para a listagem de comunidades
 * na raiz do domínio. NÃO é tenant-scoped (sem {@code @TenantId} nem RLS, V3): a
 * leitura cross-tenant é intencional. A escrita acontece apenas como sincronização
 * a partir de {@link CommunityProfile}, que é tenant-scoped.
 */
@Entity
@Table(name = "community_cards")
@Getter
@Setter
public class CommunityCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "community_slug", nullable = false, unique = true, length = 100)
    private String communitySlug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String location;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_alt_text", length = 500)
    private String imageAltText;

    @Column(name = "short_description")
    private String shortDescription;
}
