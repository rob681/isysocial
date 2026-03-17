import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { MidCta } from "@/components/landing/mid-cta";
import { UseCases } from "@/components/landing/use-cases";
import { ClientPortal } from "@/components/landing/client-portal";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <MidCta />
        <UseCases />
        <ClientPortal />
        <Testimonials />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />

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
