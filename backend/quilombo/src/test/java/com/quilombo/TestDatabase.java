package com.quilombo;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Limpeza compartilhada dos testes de integração: apaga o grafo de dados inteiro
 * em ordem FK-safe, como o dono do schema (fura o RLS de propósito).
 *
 * <p>Antes cada teste mantinha a própria lista de DELETEs e toda migration nova
 * com FK para {@code communities} quebrava os testes antigos conforme a ordem de
 * execução — a lista agora vive num único lugar: novas tabelas entram aqui.
 */
public final class TestDatabase {

    private TestDatabase() {}

    public static void wipe(String jdbcUrl, String ownerUser, String ownerPassword)
            throws SQLException {
        try (var owner = DriverManager.getConnection(jdbcUrl, ownerUser, ownerPassword);
             var st = owner.createStatement()) {
            wipe(st);
        }
    }

    /** Variante para quem já tem uma conexão de dono aberta. */
    public static void wipe(Statement st) throws SQLException {
        st.execute("DELETE FROM refresh_tokens");
        st.execute("DELETE FROM auth_login_codes");
        st.execute("DELETE FROM admins");
        st.execute("DELETE FROM page_sections");
        st.execute("DELETE FROM institutional_pages");
        st.execute("DELETE FROM community_profiles");
        st.execute("DELETE FROM community_cards");
        st.execute("DELETE FROM communities");
    }
}
