import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CommunityCard } from './community-card'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const base = {
  slug: 'kalunga',
  name: 'Kalunga',
  location: 'Chapada dos Veadeiros, GO',
  imageUrl: null,
  imageAltText: null,
  shortDescription: null,
}

describe('CommunityCard', () => {
  it('é um link acessível para a comunidade, com nome e localização', () => {
    render(
      <CommunityCard community={base} href="https://kalunga.quilombo.localhost" />
    )

    const link = screen.getByRole('link', {
      name: /ver a comunidade kalunga, em chapada dos veadeiros, go/i,
    })
    expect(link).toHaveAttribute('href', 'https://kalunga.quilombo.localhost')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Kalunga' })
    ).toBeInTheDocument()
  })

  it('mostra placeholder de iniciais quando não há imagem', () => {
    const { container } = render(<CommunityCard community={base} href="#" />)

    expect(screen.getByText('K')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renderiza imagem e descrição quando existem', () => {
    const { container } = render(
      <CommunityCard
        community={{
          ...base,
          imageUrl: 'https://cdn.example/x.webp',
          imageAltText: 'Vista aérea do território',
          shortDescription: 'Maior comunidade do país',
        }}
        href="#"
      />
    )

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://cdn.example/x.webp')
    expect(img).toHaveAttribute('alt', 'Vista aérea do território')
    expect(screen.getByText('Maior comunidade do país')).toBeInTheDocument()
  })
})
