'use client'

import { useRef, type ComponentType } from 'react'

/**
 * Renderizadores das seções institucionais — porte do `CommunityPage` do MVP.
 * Cada componente lê o `content` (JSON livre, chaves snake_case do schema) e
 * desenha a seção; o tema/estilo/paleta vêm do wrapper `.institutional`. As
 * imagens são same-origin (URL relativa do backend); sem `style` inline (CSP).
 */

type Img = { url?: string | null; alt_text?: string }

export interface SectionProps {
  content: Record<string, unknown>
  id: string
  style: string
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Imagem real ou placeholder ilustrado. */
function ImgOrPh({ image, className = '' }: { image?: Img; className?: string }) {
  if (image?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- mídia institucional same-origin; o next/image não casa com os containers .arch/.frame (CSS controla o tamanho)
      <img src={image.url} alt={image.alt_text ?? ''} className={className} loading="lazy" />
    )
  }
  return (
    <div className={`ph ${className}`} aria-hidden="true">
      <PhIcon />
    </div>
  )
}

// ── HERO ────────────────────────────────────────────────────────────────────
interface HeroContent {
  kicker?: string
  title?: string
  tagline?: string
  image?: Img
  cta_primary?: string
  cta_secondary?: string
  selo?: string
}

function HeroSection({ content, id, style }: SectionProps) {
  const c = content as HeroContent
  if (style === 'raizes') {
    return (
      <section id={id} className="hero" aria-labelledby={`${id}-t`}>
        <div className="faixa" aria-hidden="true" />
        <div className="wrap">
          <Emblema className="em-big" />
          {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
          <h1 id={`${id}-t`}>{c.title || 'Nossa comunidade'}</h1>
          {c.tagline ? <p className="tagline">{c.tagline}</p> : null}
          <div className="cta">
            {c.cta_primary ? (
              <a className="btn btn-primary" href="#sec-1">
                {c.cta_primary}
                <ArrowIcon />
              </a>
            ) : null}
            {c.cta_secondary ? (
              <a className="btn btn-ghost" href="#sec-3">
                {c.cta_secondary}
              </a>
            ) : null}
          </div>
          <div className="hero-img">
            <div className="frame">
              <ImgOrPh image={c.image} className="duo" />
            </div>
            {c.selo ? <span className="hero-selo">{c.selo}</span> : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id={id} className="hero" aria-labelledby={`${id}-t`}>
      <SunIcon />
      <div className="wrap">
        <div className="hero-txt">
          {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
          <h1 id={`${id}-t`}>{c.title || 'Nossa comunidade'}</h1>
          {c.tagline ? <p className="tagline">{c.tagline}</p> : null}
          <div className="hero-cta">
            {c.cta_primary ? (
              <a className="btn btn-primary" href="#sec-1">
                {c.cta_primary}
                <ArrowIcon />
              </a>
            ) : null}
            {c.cta_secondary ? (
              <a className="btn btn-ghost" href="#sec-3">
                {c.cta_secondary}
              </a>
            ) : null}
          </div>
        </div>
        <div className="hero-art">
          <div className="arch">
            <ImgOrPh image={c.image} />
          </div>
          {c.selo ? <div className="selo">{c.selo}</div> : null}
        </div>
      </div>
    </section>
  )
}

// ── DESCRIÇÃO CURTA ─────────────────────────────────────────────────────────
interface DescShortContent {
  label?: string
  body?: string
  portrait?: Img
}

function DescShortSection({ content, id, style }: SectionProps) {
  const c = content as DescShortContent
  if (style === 'raizes') {
    return (
      <section id={id} className="curta blk" aria-labelledby={`${id}-t`}>
        <div className="wrap">
          <div className="rv">
            <Emblema className="em-c" />
            {c.label ? <span className="lbl">{c.label}</span> : null}
            <h2 id={`${id}-t`} className="sr-only">
              Quem somos
            </h2>
            <p>{c.body}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id={id} className="curta blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <div className="panel rv">
          <div className="portrait">
            <ImgOrPh image={c.portrait} />
          </div>
          {c.label ? <span className="ktag">{c.label}</span> : null}
          <h2 id={`${id}-t`} className="sr-only">
            Quem somos
          </h2>
          <p>{c.body}</p>
        </div>
      </div>
    </section>
  )
}

// ── DESCRIÇÃO LONGA ─────────────────────────────────────────────────────────
type Block = { type: string; text?: string; image?: Img; caption?: string; cite?: string }
interface DescLongContent {
  kicker?: string
  title?: string
  blocks?: Block[]
}

function DescLongSection({ content, id }: SectionProps) {
  const c = content as DescLongContent
  return (
    <section id={id} className="longa blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head center rv">
          {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
          <h2 id={`${id}-t`}>{c.title}</h2>
          <span className="fil" aria-hidden="true" />
        </header>
        <div className="read rv">
          {arr<Block>(c.blocks).map((block, i) => {
            switch (block.type) {
              case 'paragraph':
                return <p key={i}>{block.text}</p>
              case 'heading':
                return <h3 key={i}>{block.text}</h3>
              case 'image':
                return (
                  <figure key={i}>
                    <div className="arch">
                      <ImgOrPh image={block.image} />
                    </div>
                    {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                  </figure>
                )
              case 'quote':
                return (
                  <blockquote key={i}>
                    <span className="qm" aria-hidden="true">
                      &ldquo;
                    </span>
                    <p>{block.text}</p>
                    {block.cite ? <cite>— {block.cite}</cite> : null}
                  </blockquote>
                )
              default:
                return null
            }
          })}
        </div>
      </div>
    </section>
  )
}

// ── CARROSSEL ───────────────────────────────────────────────────────────────
type CarouselCard = { title?: string; subtitle?: string; image?: Img }
interface CarouselContent {
  kicker?: string
  title?: string
  cards?: CarouselCard[]
}

function CarouselSection({ content, id }: SectionProps) {
  const c = content as CarouselContent
  const trackRef = useRef<HTMLDivElement>(null)
  function slideWidth() {
    const slide = trackRef.current?.querySelector('.slide')
    return slide ? slide.getBoundingClientRect().width + 24 : 300
  }
  return (
    <section id={id} className="blk alt" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <div className="car-top rv">
          <header className="head">
            {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
            <h2 id={`${id}-t`}>{c.title}</h2>
            <span className="fil" aria-hidden="true" />
          </header>
          <div className="car-ctrl">
            <button
              type="button"
              className="btn btn-ico"
              onClick={() =>
                trackRef.current?.scrollBy({ left: -slideWidth(), behavior: 'smooth' })
              }
              aria-label="Anterior"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              className="btn btn-ico"
              onClick={() =>
                trackRef.current?.scrollBy({ left: slideWidth(), behavior: 'smooth' })
              }
              aria-label="Próxima"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        </div>
        <div className="track rv" ref={trackRef} role="group" aria-label="Galeria">
          {arr<CarouselCard>(c.cards).map((card, i) => (
            <figure key={i} className="slide">
              <div className="card">
                <ImgOrPh image={card.image} className="duo" />
                <div className="cap">
                  <h3>{card.title}</h3>
                  {card.subtitle ? <p>{card.subtitle}</p> : null}
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── EVENTOS ─────────────────────────────────────────────────────────────────
type EventItem = {
  day?: string
  month?: string
  datetime?: string
  title?: string
  description?: string
}
interface EventsContent {
  kicker?: string
  title?: string
  events?: EventItem[]
}

function EventsSection({ content, id }: SectionProps) {
  const c = content as EventsContent
  return (
    <section id={id} className="blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head rv">
          {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
          <h2 id={`${id}-t`}>{c.title}</h2>
        </header>
        <div className="ev-list">
          {arr<EventItem>(c.events).map((ev, i) => (
            <div key={i} className="ev rv">
              <div className="date">
                <span className="d">{ev.day}</span>
                <time className="m" dateTime={ev.datetime}>
                  {ev.month}
                </time>
              </div>
              <div className="info">
                <h3>{ev.title}</h3>
                {ev.description ? <p>{ev.description}</p> : null}
              </div>
              <span className="go" aria-hidden="true">
                <ArrowIcon />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CRONOLOGIA ──────────────────────────────────────────────────────────────
type TimelineEntry = {
  year?: string
  title?: string
  description?: string
  is_recent?: boolean
}
interface TimelineContent {
  kicker?: string
  title?: string
  entries?: TimelineEntry[]
}

function TimelineSection({ content, id }: SectionProps) {
  const c = content as TimelineContent
  return (
    <section id={id} className="blk alt" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head rv">
          {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
          <h2 id={`${id}-t`}>{c.title}</h2>
        </header>
        <div className="tl">
          {arr<TimelineEntry>(c.entries).map((entry, i) => (
            <div key={i} className={`marco rv ${entry.is_recent ? 'rec' : ''}`}>
              <div className="ano">{entry.year}</div>
              <div className="body">
                <h3>{entry.title}</h3>
                {entry.description ? <p>{entry.description}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── LOCALIZAÇÃO ─────────────────────────────────────────────────────────────
interface LocationContent {
  kicker?: string
  title?: string
  place_name?: string
  address?: string
  pills?: string[]
  cta_label?: string
  map_image?: Img
}

function LocationSection({ content, id }: SectionProps) {
  const c = content as LocationContent
  const lines = (c.address ?? '').split('\n')
  return (
    <section id={id} className="blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head rv">
          {c.kicker ? <span className="kicker">{c.kicker}</span> : null}
          <h2 id={`${id}-t`}>{c.title}</h2>
        </header>
        <div className="loc rv">
          <div className="arch frame">
            <ImgOrPh image={c.map_image} className="duo" />
          </div>
          <div className="loc-card">
            <h3>{c.place_name}</h3>
            {c.address ? (
              <address>
                {lines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </address>
            ) : null}
            {arr<string>(c.pills).length > 0 ? (
              <div className="pills">
                {arr<string>(c.pills).map((p, i) => (
                  <span key={i} className="pill">
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
            {c.cta_label ? (
              <a
                className="btn btn-primary"
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.cta_label}
                <ArrowIcon />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export const SECTION_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  hero: HeroSection,
  description_short: DescShortSection,
  description_long: DescLongSection,
  carousel: CarouselSection,
  events: EventsSection,
  timeline: TimelineSection,
  location: LocationSection,
}

// ── ícones ──────────────────────────────────────────────────────────────────
export function LeafIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 21c0-8 6-14 14-15-1 9-7 15-14 15z" />
      <path d="M9 17c2.5-3 5-5 8-6" />
    </svg>
  )
}

export function Emblema({ className = '' }: { className?: string }) {
  return (
    <svg className={`emblema ${className}`} viewBox="0 0 120 150" aria-hidden="true">
      <polygon points="60,6 82,40 38,40" fill="var(--ip-accent)" />
      <rect x="54" y="36" width="12" height="14" fill="currentColor" />
      <circle cx="60" cy="64" r="16" fill="currentColor" />
      <circle cx="60" cy="64" r="6.5" fill="var(--ip-accent)" />
      <polygon points="30,96 18,80 42,80" fill="currentColor" />
      <polygon points="90,96 78,80 102,80" fill="currentColor" />
      <rect x="20" y="96" width="80" height="12" fill="currentColor" />
      <rect x="40" y="116" width="40" height="10" fill="var(--ip-accent)" />
      <rect x="52" y="126" width="16" height="18" fill="currentColor" />
    </svg>
  )
}

function PhIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 16l5-5 4 4 4-5 5 6M3 19h18" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      className="sun"
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="42" />
      <g strokeLinecap="round">
        <path d="M100 18v26M100 156v26M18 100h26M156 100h26M42 42l18 18M140 140l18 18M158 42l-18 18M60 140l-18 18" />
      </g>
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}
