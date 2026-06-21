'use client'

import { useEffect, useRef } from 'react'

/** Script oficial do Google Identity Services. */
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential: string }) => void
      }) => void
      renderButton: (el: HTMLElement, options: Record<string, string>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

/**
 * Botão "Entrar com Google" do Google Identity Services. Carrega o script do GIS,
 * renderiza o botão oficial e devolve o `credential` (idToken) via {@link onCredential}.
 * Sem `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, exibe um aviso (dev). A injeção do script roda
 * sob `strict-dynamic` da CSP — o bundle (com nonce) é a raiz de confiança.
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (idToken: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || !ref.current) return

    const render = () => {
      const id = window.google?.accounts.id
      if (!id || !ref.current) return
      id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      })
      id.renderButton(ref.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'center',
        // sem `width`: uma largura fixa faz o GIS embrulhar a pílula num container
        // mais largo e claro (a pílula fica centralizada nele), o que vira um
        // "retângulo branco" atrás do botão no fundo escuro. Sem largura, o
        // container abraça a pílula — o botão sai com a largura natural do texto.
      })
    }

    if (window.google) {
      render()
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = render
    document.head.appendChild(script)
  }, [clientId, onCredential])

  if (!clientId) {
    return (
      <p role="note" className="text-fg-muted text-center text-sm">
        Configure <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> para habilitar o login.
      </p>
    )
  }
  // O botão do GIS é um iframe cross-origin. No tema escuro a página propaga
  // `color-scheme: dark`, e quando ele diverge do esquema (claro) do documento
  // do Google, o navegador pinta um backdrop opaco atrás do iframe — o
  // "retângulo branco" atrás da pílula (sobretudo no Firefox). Forçar
  // `color-scheme: light` neste wrapper alinha o esquema ao do iframe e remove o
  // backdrop, sem afetar o resto da página (o subtree só contém o botão).
  return (
    <div
      ref={ref}
      className="flex justify-center"
      style={{ colorScheme: 'light' }}
    />
  )
}
