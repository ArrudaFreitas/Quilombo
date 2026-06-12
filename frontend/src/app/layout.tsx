import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import { SkipLink } from "@/components/SkipLink";
import "./globals.css";

/*
 * Tipografia do projeto (invariante por estilo/paleta):
 * - Fraunces: display (títulos)
 * - Atkinson Hyperlegible: corpo — fonte desenhada para legibilidade
 *   (baixa visão), alinhada ao requisito de inclusão do projeto.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Quilombo",
    template: "%s · Quilombo",
  },
  description:
    "Plataforma para comunidades quilombolas criarem e gerenciarem suas páginas institucionais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${atkinson.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        {/* WCAG 2.4.1 — toda página deve ter um <main id="conteudo"> como alvo. */}
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
