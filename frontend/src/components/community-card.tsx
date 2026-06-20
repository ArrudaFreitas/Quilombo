import type { Community } from '@/lib/api/communities'
import { CommunityImage } from './community-image'

interface CommunityCardProps {
  community: Community
  /** URL absoluta do subdomínio da comunidade. */
  href: string
}

/**
 * Card do diretório. O card inteiro é um único link (foco/teclado nativos,
 * funciona sem JS) com nome acessível descritivo.
 */
export function CommunityCard({ community, href }: CommunityCardProps) {
  const { slug, name, location, imageUrl, imageAltText, shortDescription } =
    community

  return (
    <li>
      <a
        href={href}
        aria-label={`Ver a comunidade ${name}, em ${location}`}
        className="surface card-interactive group flex h-full flex-col overflow-hidden"
      >
        <div className="bg-bg-subtle relative aspect-[16/9] overflow-hidden">
          <CommunityImage
            src={imageUrl}
            name={name}
            slug={slug}
            alt={imageAltText ?? ''}
          />
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="text-primary mb-2 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
            <PinIcon />
            <span>{location}</span>
          </p>

          <h2 className="font-display text-fg text-xl leading-tight font-semibold">
            {name}
          </h2>

          {shortDescription ? (
            <p className="text-fg-muted mt-2 line-clamp-3 text-sm">
              {shortDescription}
            </p>
          ) : null}

          <span
            className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-bold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          >
            Conhecer
            <ArrowIcon />
          </span>
        </div>
      </a>
    </li>
  )
}

function PinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
