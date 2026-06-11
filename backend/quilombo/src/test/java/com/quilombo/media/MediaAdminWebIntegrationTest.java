package com.quilombo.media;

import com.quilombo.TestDatabase;
import com.quilombo.TestcontainersConfiguration;
import com.quilombo.auth.Admin;
import com.quilombo.auth.AdminRepository;
import com.quilombo.auth.AuthService;
import com.quilombo.auth.EmailHasher;
import com.quilombo.community.Community;
import com.quilombo.community.CommunityRepository;
import com.quilombo.page.PageSection;
import com.quilombo.page.PageSectionRepository;
import com.quilombo.storage.StorageService;
import com.quilombo.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.sql.SQLException;
import java.util.Map;

import javax.imageio.ImageIO;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acervo de imagens de ponta a ponta: upload processa (resize + WebP real via
 * Scrimage) e grava no storage (mockado), listagem marca o "em uso", edição de
 * alt, remoção bloqueada quando referenciada, quota e as recusas (validações,
 * 404 e 401). O {@link StorageService} é mockado — o adapter S3 real é exercido
 * via docker-compose/MinIO.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class MediaAdminWebIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@kalunga.org";
    private static final String BASE = "https://kalunga.quilombo.localhost/api/v1/admin";
    private static final String IMAGES_URL = BASE + "/images";
    private static final String UPLOAD_URL = BASE + "/upload";
    private static final String STORAGE_URL = BASE + "/storage";
    private static final long LIMIT_BYTES = 52_428_800L;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    AuthService authService;

    @Autowired
    AdminRepository admins;

    @Autowired
    CommunityRepository communities;

    @Autowired
    PageSectionRepository sections;

    @Autowired
    StorageObjectRepository objects;

    @Autowired
    EmailHasher emailHasher;

    @MockitoBean
    StorageService storage;

    @Value("${spring.datasource.url}")
    String jdbcUrl;

    @Value("${spring.flyway.user}")
    String ownerUser;

    @Value("${spring.flyway.password}")
    String ownerPassword;

    Long kalungaId;

    @BeforeEach
    void seed() throws SQLException {
        TestDatabase.wipe(jdbcUrl, ownerUser, ownerPassword);
        kalungaId = communities
                .save(community("kalunga", "Kalunga", "Chapada dos Veadeiros, GO")).getId();

        TenantContext.setCommunityId(kalungaId);
        var admin = new Admin();
        admin.setEmailHash(emailHasher.hash(ADMIN_EMAIL));
        admins.save(admin);
        TenantContext.clear();

        // a URL pública carrega o filename — é o que o teste de "em uso" referencia
        when(storage.publicUrl(anyString()))
                .thenAnswer(call -> "http://localhost:9000/quilombo-uploads/" + call.getArgument(0));
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void upload_processes_stores_and_then_lists_the_image() throws Exception {
        var jwt = login();

        var filename = upload(jwt, pngBytes(800, 600), "Vista da comunidade");
        verify(storage, times(1)).put(eq(filename), any(byte[].class), eq("image/webp"));

        mockMvc.perform(get(IMAGES_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].filename").value(filename))
                .andExpect(jsonPath("$.data[0].altText").value("Vista da comunidade"))
                .andExpect(jsonPath("$.data[0].sizeBytes").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.data[0].inUse").value(false));
    }

    @Test
    void uploaded_filename_is_namespaced_by_slug_and_is_webp() throws Exception {
        var filename = upload(login(), pngBytes(100, 100), "x");
        org.assertj.core.api.Assertions.assertThat(filename)
                .startsWith("kalunga_")
                .endsWith(".webp");
    }

    @Test
    void upload_without_alt_text_is_422() throws Exception {
        mockMvc.perform(multipart(UPLOAD_URL)
                        .file(new MockMultipartFile("file", "f.png", "image/png", pngBytes(50, 50)))
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Texto alternativo é obrigatório"));
    }

    @Test
    void upload_of_a_non_image_is_400() throws Exception {
        mockMvc.perform(multipart(UPLOAD_URL)
                        .file(new MockMultipartFile("file", "a.txt", "text/plain", "só texto".getBytes()))
                        .param("altText", "qualquer")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Apenas imagens são permitidas"));
    }

    @Test
    void upload_of_a_corrupt_image_is_400() throws Exception {
        // content-type de imagem, mas bytes que não decodificam
        mockMvc.perform(multipart(UPLOAD_URL)
                        .file(new MockMultipartFile("file", "broken.png", "image/png", "isto não é PNG".getBytes()))
                        .param("altText", "quebrada")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Não foi possível processar a imagem"));
    }

    @Test
    void upload_larger_than_the_upload_limit_is_413() throws Exception {
        var sixMb = new byte[6 * 1024 * 1024];
        mockMvc.perform(multipart(UPLOAD_URL)
                        .file(new MockMultipartFile("file", "big.png", "image/png", sixMb))
                        .param("altText", "grande")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.detail").value("Arquivo muito grande. Máximo: 5 MB"));
    }

    @Test
    void upload_that_would_exceed_the_quota_is_400() throws Exception {
        inTenant(() -> storageRow("kalunga_full.webp", LIMIT_BYTES));

        mockMvc.perform(multipart(UPLOAD_URL)
                        .file(new MockMultipartFile("file", "f.png", "image/png", pngBytes(50, 50)))
                        .param("altText", "estoura a quota")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Limite de armazenamento atingido (50 MB)"));
    }

    @Test
    void list_marks_an_image_referenced_by_a_section_as_in_use() throws Exception {
        var jwt = login();
        var filename = upload(jwt, pngBytes(200, 200), "usada");
        var url = "http://localhost:9000/quilombo-uploads/" + filename;
        inTenant(() -> section("hero", Map.of("background", url)));

        mockMvc.perform(get(IMAGES_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].filename").value(filename))
                .andExpect(jsonPath("$.data[0].inUse").value(true));
    }

    @Test
    void update_alt_text_changes_it() throws Exception {
        var jwt = login();
        var filename = upload(jwt, pngBytes(120, 120), "antes");

        mockMvc.perform(put(IMAGES_URL + "/" + filename + "/alt")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"altText\":\"depois\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.altText").value("depois"));

        mockMvc.perform(get(IMAGES_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(jsonPath("$.data[0].altText").value("depois"));
    }

    @Test
    void update_alt_text_blank_is_422() throws Exception {
        var jwt = login();
        var filename = upload(jwt, pngBytes(120, 120), "antes");

        mockMvc.perform(put(IMAGES_URL + "/" + filename + "/alt")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"altText\":\"   \"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Texto alternativo é obrigatório"));
    }

    @Test
    void update_alt_of_an_unknown_image_is_404() throws Exception {
        mockMvc.perform(put(IMAGES_URL + "/inexistente.webp/alt")
                        .header("Authorization", "Bearer " + login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"altText\":\"x\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Imagem não encontrada"));
    }

    @Test
    void delete_removes_an_unused_image() throws Exception {
        var jwt = login();
        var filename = upload(jwt, pngBytes(150, 150), "remover");

        mockMvc.perform(delete(IMAGES_URL + "/" + filename)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());
        verify(storage, times(1)).delete(filename);

        mockMvc.perform(get(IMAGES_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void delete_of_an_image_in_use_is_409() throws Exception {
        var jwt = login();
        var filename = upload(jwt, pngBytes(150, 150), "em uso");
        var url = "http://localhost:9000/quilombo-uploads/" + filename;
        inTenant(() -> section("carousel", Map.of("images", java.util.List.of(url))));

        mockMvc.perform(delete(IMAGES_URL + "/" + filename)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail")
                        .value("Imagem em uso por uma seção ou card — remova o uso antes de deletar"));

        verify(storage, Mockito.never()).delete(anyString());
    }

    @Test
    void delete_of_an_unknown_image_is_404() throws Exception {
        mockMvc.perform(delete(IMAGES_URL + "/inexistente.webp")
                        .header("Authorization", "Bearer " + login()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Imagem não encontrada"));
    }

    @Test
    void storage_usage_reports_used_and_limit() throws Exception {
        var jwt = login();
        upload(jwt, pngBytes(300, 300), "ocupa espaço");

        mockMvc.perform(get(STORAGE_URL).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.limitBytes").value(LIMIT_BYTES))
                .andExpect(jsonPath("$.data.limitMb").value(50))
                .andExpect(jsonPath("$.data.usedBytes").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    void without_token_is_401() throws Exception {
        mockMvc.perform(get(IMAGES_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Sessão inválida"));
    }

    // ---------- helpers ----------

    /** Faz o upload e devolve o filename gerado (lido da resposta). */
    private String upload(String jwt, byte[] image, String altText) throws Exception {
        var body = mockMvc.perform(multipart(UPLOAD_URL)
                        .file(new MockMultipartFile("file", "img.png", "image/png", image))
                        .param("altText", altText)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonMapper.builder().build().readTree(body).get("data").get("filename").asString();
    }

    private static byte[] pngBytes(int width, int height) throws Exception {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var graphics = image.createGraphics();
        graphics.setColor(Color.RED);
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private void storageRow(String filename, long sizeBytes) {
        var object = new StorageObject();
        object.setFilename(filename);
        object.setSizeBytes(sizeBytes);
        object.setAltText("seed");
        objects.save(object);
    }

    private void section(String type, Map<String, Object> content) {
        var section = new PageSection();
        section.setSectionType(type);
        section.setOrderIndex(0);
        section.setActive(true);
        section.setContent(content);
        sections.save(section);
    }

    private void inTenant(Runnable block) {
        TenantContext.setCommunityId(kalungaId);
        try {
            block.run();
        } finally {
            TenantContext.clear();
        }
    }

    /** Executa a troca real do código no subdomínio kalunga e devolve o JWT. */
    private String login() throws Exception {
        var code = authService.issueLoginCode(ADMIN_EMAIL, "Maria");
        var body = mockMvc.perform(post("https://kalunga.quilombo.localhost/api/v1/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonMapper.builder().build().readTree(body).get("data").get("token").asString();
    }

    private static Community community(String slug, String name, String location) {
        var community = new Community();
        community.setSlug(slug);
        community.setName(name);
        community.setLocation(location);
        return community;
    }
}
