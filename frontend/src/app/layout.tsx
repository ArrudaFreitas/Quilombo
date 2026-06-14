import type { Metadata, Viewport } from 'next'
import { Fraunces, Atkinson_Hyperlegible } from 'next/font/google'
import { headers } from 'next/headers'
import { SkipLink } from '@/components/skip-link'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeScript } from '@/components/theme-script'
import { ThemeToggle } from '@/components/theme-toggle'
import '@/styles/globals.css'

// Display — Fraunces (variável: peso + óptico). Exposta como --font-fraunces.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz'],
})

// Corpo — Atkinson Hyperlegible (desenhada para legibilidade / WCAG).
const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-atkinson',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Quilombo',
    default: 'Quilombo — Diretório de Comunidades',
  },
  description:
    'Encontre e conecte-se com comunidades quilombolas em todo o Brasil.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // sem maximumScale/userScalable: zoom até 200%+ permitido (WCAG 1.4.4)
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2ead3' },
    { media: '(prefers-color-scheme: dark)', color: '#15140e' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // nonce gerado no proxy.ts — necessário para o script anti-flash sob CSP estrito
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html
      lang="pt-BR"
      data-theme="light"
      suppressHydrationWarning
      className={`${fraunces.variable} ${atkinson.variable} h-full`}
    >
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <SkipLink />
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
