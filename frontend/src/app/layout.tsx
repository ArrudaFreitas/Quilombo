import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SkipLink } from '@/components/skip-link'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: '%s | Quilombo',
    default: 'Quilombo — Diretório de Comunidades',
  },
  description:
    'Encontre e conecte-se com comunidades quilombolas em todo o Brasil.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SkipLink />
        {children}
      </body>
    </html>
  )
}
