package com.quilombo.page;

import com.quilombo.tenant.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Configuração visual da página institucional do tenant (uma linha por comunidade).
 * Os valores iniciais dos campos espelham os defaults do schema (V1): enquanto o
 * admin não configura nada, a página pública renderiza com eles.
 */
@Entity
@Table(name = "institutional_pages")
@Getter
@Setter
public class InstitutionalPage extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String style = "uniao";

    @Column(nullable = false, length = 50)
    private String palette = "verde";
}
