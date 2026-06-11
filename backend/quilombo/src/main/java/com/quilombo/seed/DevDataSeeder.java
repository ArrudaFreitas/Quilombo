package com.quilombo.seed;

import com.quilombo.auth.Admin;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.EmailHasher;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import com.quilombo.tenant.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seed de desenvolvimento: as 3 comunidades do MVP e, se {@code DEV_ADMIN_EMAIL}
 * estiver definido, registra esse e-mail como admin de todas elas — é o que
 * permite testar o login com Google real no navegador, já que o HMAC do e-mail
 * precisa ser calculado com o {@code EMAIL_HASH_SECRET} do ambiente (por isso o
 * seed é Java, e não SQL do Flyway).
 *
 * <p>Idempotente (reexecutar não duplica) e <b>sem {@code @Transactional}</b> de
 * propósito: o tenant do {@code @TenantId} é capturado na abertura da sessão, e
 * numa transação única todos os admins herdariam o tenant da primeira comunidade.
 * Cada chamada de repositório abre a própria sessão com o {@link TenantContext}
 * vigente.
 */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@Slf4j
public class DevDataSeeder implements ApplicationRunner {

    private record SeedCommunity(String slug, String name, String location) {}

    private static final List<SeedCommunity> COMMUNITIES = List.of(
            new SeedCommunity("kalunga", "Kalunga", "Chapada dos Veadeiros, GO"),
            new SeedCommunity("palmares", "Quilombo dos Palmares", "União dos Palmares, AL"),
            new SeedCommunity("frechal", "Frechal", "Mirinzal, MA"));

    private final CommunityRepository communities;
    private final AdminRepository admins;
    private final EmailHasher emailHasher;
    private final String devAdminEmail;

    public DevDataSeeder(CommunityRepository communities,
                         AdminRepository admins,
                         EmailHasher emailHasher,
                         @Value("${DEV_ADMIN_EMAIL:}") String devAdminEmail) {
        this.communities = communities;
        this.admins = admins;
        this.emailHasher = emailHasher;
        this.devAdminEmail = devAdminEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (var seed : COMMUNITIES) {
            var community = communities.findBySlug(seed.slug())
                    .orElseGet(() -> communities.save(toEntity(seed)));
            registerDevAdmin(community);
        }
        if (devAdminEmail.isBlank()) {
            log.info("[seed] {} comunidades; defina DEV_ADMIN_EMAIL com seu e-mail "
                    + "Google para se registrar como admin e testar o login", COMMUNITIES.size());
        } else {
            log.info("[seed] {} comunidades; DEV_ADMIN_EMAIL registrado como admin em todas",
                    COMMUNITIES.size());
        }
    }

    private void registerDevAdmin(Community community) {
        if (devAdminEmail.isBlank()) {
            return;
        }
        try {
            TenantContext.setCommunityId(community.getId());
            var emailHash = emailHasher.hash(devAdminEmail);
            if (admins.findByEmailHash(emailHash).isEmpty()) {
                var admin = new Admin();
                admin.setEmailHash(emailHash);
                admins.save(admin);
            }
        } finally {
            TenantContext.clear();
        }
    }

    private static Community toEntity(SeedCommunity seed) {
        var community = new Community();
        community.setSlug(seed.slug());
        community.setName(seed.name());
        community.setLocation(seed.location());
        return community;
    }
}
