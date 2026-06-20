'use client'

import Image from 'next/image'
import { useState } from 'react'
import styles from './community-image.module.css'

const VARIANT_COUNT = 6

/** Cor de fundo determinística (estável por slug) do placeholder. */
function variantFor(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % VARIANT_COUNT
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

interface CommunityImageProps {
  src: string | null
  name: string
  slug: string
  /** Texto alternativo da imagem. Vazio (`''`) = decorativa (ex.: card do diretório,
   * onde o link já carrega o nome acessível da comunidade). */
  alt?: string
}

/**
 * Mídia do card. Renderiza a imagem quando há `src`; cai para o placeholder de
 * iniciais quando não há imagem OU quando o carregamento falha (fallback de
 * imagem). É decorativa — o nome acessível vem do link do card. A imagem vem
 * same-origin do MinIO via nginx; `unoptimized` pula o otimizador do Next (o
 * backend já entrega WebP dimensionado).
 */
export function CommunityImage({ src, name, slug, alt = '' }: CommunityImageProps) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        className="object-cover"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={styles.placeholder}
      data-variant={variantFor(slug)}
      aria-hidden="true"
    >
      <span className={styles.initials}>{initials(name)}</span>
    </div>
  )
}
