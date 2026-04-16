import type { Metadata } from "next";
import { LandingSections } from "@/components/landing/landing-sections";

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

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingSections />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Isysocial",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Plataforma de gestion de redes sociales para agencias de marketing digital. Calendario editorial, aprobacion de clientes y publicacion directa.",
            offers: [
              {
                "@type": "Offer",
                name: "Starter",
                price: "29",
                priceCurrency: "USD",
                priceValidUntil: "2027-12-31",
              },
              {
                "@type": "Offer",
                name: "Pro",
                price: "79",
                priceCurrency: "USD",
                priceValidUntil: "2027-12-31",
              },
            ],
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              reviewCount: "127",
            },
          }),
        }}
      />
    </div>
  );
}
