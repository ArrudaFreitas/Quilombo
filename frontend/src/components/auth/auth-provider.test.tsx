import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const nav = { replace: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
}))

const api = {
  refreshSession: vi.fn(),
  getMe: vi.fn(),
  logout: vi.fn(),
  loginWithGoogle: vi.fn(),
}
vi.mock('@/lib/api/auth', () => ({
  refreshSession: () => api.refreshSession(),
  getMe: (token: string) => api.getMe(token),
  logout: () => api.logout(),
  loginWithGoogle: (idToken: string) => api.loginWithGoogle(idToken),
}))

const { AuthProvider, useAuth } = await import('./auth-provider')

function Probe() {
  const { status, user, logout } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.name ?? '-'}</span>
      <button type="button" onClick={() => void logout()}>
        sair
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

beforeEach(() => {
  nav.replace.mockReset()
  Object.values(api).forEach((fn) => fn.mockReset())
})

describe('AuthProvider', () => {
  it('recupera a sessão pelo refresh httpOnly no mount', async () => {
    api.refreshSession.mockResolvedValue('jwt')
    api.getMe.mockResolvedValue({
      id: 1,
      name: 'Maria',
      communitySlug: 'kalunga',
    })

    renderProvider()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
    expect(screen.getByTestId('user')).toHaveTextContent('Maria')
    expect(api.getMe).toHaveBeenCalledWith('jwt')
  })

  it('fica unauthenticated quando não há refresh válido', async () => {
    api.refreshSession.mockRejectedValue(new Error('401'))

    renderProvider()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    )
    expect(api.getMe).not.toHaveBeenCalled()
  })

  it('logout limpa a sessão e redireciona para /login', async () => {
    api.refreshSession.mockResolvedValue('jwt')
    api.getMe.mockResolvedValue({
      id: 1,
      name: 'Maria',
      communitySlug: 'kalunga',
    })
    api.logout.mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )

    await user.click(screen.getByRole('button', { name: 'sair' }))

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    )
    expect(api.logout).toHaveBeenCalledOnce()
    expect(nav.replace).toHaveBeenCalledWith('/login')
  })
})
