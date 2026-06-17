import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoogleSignInButton } from './google-sign-in-button'

afterEach(() => {
  vi.unstubAllEnvs()
  delete (window as { google?: unknown }).google
})

describe('GoogleSignInButton', () => {
  it('mostra aviso de configuração quando falta o client id', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '')

    render(<GoogleSignInButton onCredential={() => {}} />)

    expect(screen.getByRole('note')).toHaveTextContent(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    )
  })

  it('inicializa o GIS e renderiza o botão quando há client id', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id')
    const initialize = vi.fn()
    const renderButton = vi.fn()
    // window.google já presente → o componente usa o caminho de render direto,
    // sem injetar o <script> (evita fetch real do GIS no ambiente de teste).
    ;(window as { google?: unknown }).google = {
      accounts: { id: { initialize, renderButton } },
    }

    render(<GoogleSignInButton onCredential={() => {}} />)

    expect(screen.queryByRole('note')).toBeNull()
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id' }),
    )
    expect(renderButton).toHaveBeenCalled()
  })
})
