declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test'
    /** URL interna do backend — só acessível no servidor Next.js (nunca exposta ao browser). */
    readonly API_URL: string
    /** Domínio base da aplicação (ex.: quilombo.ianarruda.dev). */
    readonly NEXT_PUBLIC_BASE_DOMAIN: string
    /** Client-id do OAuth do Google — habilita o botão do Google Identity Services. */
    readonly NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string
    /** URL pública do storage de imagens (MinIO ou S3). */
    readonly NEXT_PUBLIC_STORAGE_URL?: string
  }
}
