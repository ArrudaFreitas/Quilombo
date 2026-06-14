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
}

/**
 * Mídia do card. Renderiza a imagem (otimizada) quando há `src`; cai para o
 * placeholder de iniciais quando não há imagem OU quando o carregamento falha
 * (fallback de imagem). É decorativa — o nome acessível vem do link do card.
 */
export function CommunityImage({ src, name, slug }: CommunityImageProps) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
