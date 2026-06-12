package com.quilombo.seed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quilombo.auth.Admin;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.EmailHasher;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityCard;
import com.quilombo.community.CommunityCardRepository;
import com.quilombo.community.CommunityProfile;
import com.quilombo.community.CommunityProfileRepository;
import com.quilombo.community.CommunityRepository;
import com.quilombo.page.InstitutionalPage;
import com.quilombo.page.InstitutionalPageRepository;
import com.quilombo.page.PageSection;
import com.quilombo.page.PageSectionRepository;
import com.quilombo.tenant.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;

/**
 * Seed de desenvolvimento com paridade com o MVP: as 3 comunidades, os cards do
 * diretório (com descrição), as páginas institucionais completas (estilo,
 * paleta e seções de exemplo — conteúdo em {@code seed/dev-pages.json}) e os
 * admins de demonstração {@code admin.<slug>@example.com}, que permitem entrar
 * no painel via login de desenvolvimento ({@code POST /auth/dev-login}) sem
 * credenciais do Google. Se {@code DEV_ADMIN_EMAIL} estiver definido, esse
 * e-mail também vira admin de todas as comunidades (login Google real).
 *
 * <p>Idempotente por recurso (reexecutar não duplica nem sobrescreve edições) e
 * <b>sem {@code @Transactional}</b> de propósito: o tenant do {@code @TenantId}
 * é capturado na abertura da sessão, e numa transação única tudo herdaria o
 * tenant da primeira comunidade. Cada chamada de repositório abre a própria
 * sessão com o {@link TenantContext} vigente.
 */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@Slf4j
public class DevDataSeeder implements ApplicationRunner {

    private record SeedCommunity(String slug, String name, String location) {}

    /** Estrutura de {@code seed/dev-pages.json}. */
    record SeedPage(String shortDescription, String style, String palette,
                    List<SeedSection> sections) {}

    record SeedSection(String sectionType, Map<String, Object> content) {}

    private static final List<SeedCommunity> COMMUNITIES = List.of(
            new SeedCommunity("kalunga", "Kalunga", "Chapada dos Veadeiros, GO"),
            new SeedCommunity("palmares", "Quilombo dos Palmares", "União dos Palmares, AL"),
            new SeedCommunity("frechal", "Frechal", "Mirinzal, MA"));

    /**
     * Mapper local (Jackson 2, dependência do projeto) só para ler o resource —
     * o Spring Boot 4 não expõe mais um bean de ObjectMapper desse pacote.
     */
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final CommunityRepository communities;
    private final CommunityCardRepository cards;
    private final CommunityProfileRepository profiles;
    private final InstitutionalPageRepository pages;
    private final PageSectionRepository sections;
    private final AdminRepository admins;
    private final EmailHasher emailHasher;
    private final String devAdminEmail;

    public DevDataSeeder(CommunityRepository communities,
                         CommunityCardRepository cards,
                         CommunityProfileRepository profiles,
                         InstitutionalPageRepository pages,
                         PageSectionRepository sections,
                         AdminRepository admins,
                         EmailHasher emailHasher,
                         @Value("${DEV_ADMIN_EMAIL:}") String devAdminEmail) {
        this.communities = communities;
        this.cards = cards;
        this.profiles = profiles;
        this.pages = pages;
        this.sections = sections;
        this.admins = admins;
        this.emailHasher = emailHasher;
        this.devAdminEmail = devAdminEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        var seedPages = loadSeedPages();
        for (var seed : COMMUNITIES) {
            var seedPage = seedPages.get(seed.slug());
            var community = communities.findBySlug(seed.slug())
                    .orElseGet(() -> communities.save(toEntity(seed)));
            cards.findByCommunitySlug(seed.slug())
                    .orElseGet(() -> cards.save(toCard(seed, seedPage)));
            seedTenantData(community, seedPage);
        }
        log.info("[seed] {} comunidades com página institucional de exemplo; admins de "
                        + "demonstração admin.<slug>@example.com (login de dev){}",
                COMMUNITIES.size(),
                devAdminEmail.isBlank()
                        ? " — defina DEV_ADMIN_EMAIL para também testar o login Google"
                        : "; DEV_ADMIN_EMAIL registrado como admin em todas");
    }

    /** Dados tenant-scoped (RLS): perfil, página com seções e allowlist de admins. */
    private void seedTenantData(Community community, SeedPage seedPage) {
        try {
            TenantContext.setCommunityId(community.getId());

            if (profiles.findTopByOrderByIdAsc().isEmpty()) {
                var profile = new CommunityProfile();
                profile.setShortDescription(seedPage.shortDescription());
                profiles.save(profile);
            }

            if (pages.findTopByOrderByIdAsc().isEmpty()) {
                var page = new InstitutionalPage();
                page.setStyle(seedPage.style());
                page.setPalette(seedPage.palette());
                pages.save(page);

                var order = 0;
                for (var seedSection : seedPage.sections()) {
                    var section = new PageSection();
                    section.setSectionType(seedSection.sectionType());
                    section.setOrderIndex(order++);
                    section.setContent(seedSection.content());
                    sections.save(section);
                }
            }

            registerAdmin("admin." + community.getSlug() + "@example.com");
            if (!devAdminEmail.isBlank()) {
                registerAdmin(devAdminEmail);
            }
        } finally {
            TenantContext.clear();
        }
    }

    private void registerAdmin(String email) {
        var emailHash = emailHasher.hash(email);
        if (admins.findByEmailHash(emailHash).isEmpty()) {
            var admin = new Admin();
            admin.setEmailHash(emailHash);
            admins.save(admin);
        }
    }

    private Map<String, SeedPage> loadSeedPages() {
        try (var input = new ClassPathResource("seed/dev-pages.json").getInputStream()) {
            return MAPPER.readValue(input, new TypeReference<>() {});
        } catch (IOException e) {
            throw new UncheckedIOException("Falha lendo seed/dev-pages.json", e);
        }
    }

    private static Community toEntity(SeedCommunity seed) {
        var community = new Community();
        community.setSlug(seed.slug());
        community.setName(seed.name());
        community.setLocation(seed.location());
        return community;
    }

    /** Card do diretório público, já com a descrição do MVP (imagem fica para o admin). */
    private static CommunityCard toCard(SeedCommunity seed, SeedPage seedPage) {
        var card = new CommunityCard();
        card.setCommunitySlug(seed.slug());
        card.setName(seed.name());
        card.setLocation(seed.location());
        card.setShortDescription(seedPage.shortDescription());
        return card;
    }
}
