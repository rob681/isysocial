import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Isysocial — Gestion de redes sociales para agencias",
  description:
    "Plataforma todo-en-uno para agencias de marketing: calendario editorial, aprobacion de clientes, publicacion directa en Instagram, Facebook, LinkedIn, X y TikTok. Prueba gratis 14 dias.",
  keywords: [
    "gestion redes sociales",
    "herramienta social media",
    "agencia marketing digital",
    "calendario editorial",
    "programar publicaciones",
    "aprobacion contenido",
    "social media management",
    "hootsuite alternativa",
    "isysocial",
  ],
  openGraph: {
    title: "Isysocial — Gestion de redes sociales para agencias",
    description:
      "Calendario editorial, aprobacion de clientes y publicacion directa en todas las redes. Prueba gratis 14 dias.",
    type: "website",
    locale: "es_ES",
    siteName: "Isysocial",
  },
  twitter: {
    card: "summary_large_image",
    title: "Isysocial — Gestion de redes sociales para agencias",
    description:
      "Calendario editorial, aprobacion de clientes y publicacion directa. Prueba gratis 14 dias.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
