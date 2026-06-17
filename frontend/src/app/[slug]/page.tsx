import type { Metadata } from 'next'
import { CommunityHome } from '@/components/community/community-home'

/**
 * Home pública de uma comunidade (`{slug}.dominio`, reescrita pelo proxy para
 * `/{slug}`). O conteúdo é buscado no cliente (`CommunityHome`), pois o tenant é
 * resolvido pelo subdomínio (Host) — same-origin via nginx. A identidade da
 * comunidade vira o `<title>` em runtime. O conteúdo institucional completo
 * (seções por estilo/paleta) é de uma etapa futura — ver `styles/institutional`.
 */
export const metadata: Metadata = {
  title: 'Comunidade Quilombola',
  description:
    'Conheça esta comunidade quilombola — sua história, território e cultura.',
}

export default function CommunityHomePage() {
  return <CommunityHome />
}
