"use client";

import { LandingErrorBoundary } from "./landing-error-boundary";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Features } from "./features";
import { MidCta } from "./mid-cta";
import { UseCases } from "./use-cases";
import { ClientPortal } from "./client-portal";
import { Testimonials } from "./testimonials";
import { Pricing } from "./pricing";
import { CtaSection } from "./cta-section";
import { Footer } from "./footer";

export function LandingSections() {
  return (
    <>
      <LandingErrorBoundary fallbackSection="Navbar">
        <Navbar />
      </LandingErrorBoundary>
      <main>
        <LandingErrorBoundary fallbackSection="Hero">
          <Hero />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="Features">
          <Features />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="MidCta">
          <MidCta />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="UseCases">
          <UseCases />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="ClientPortal">
          <ClientPortal />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="Testimonials">
          <Testimonials />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="Pricing">
          <Pricing />
        </LandingErrorBoundary>
        <LandingErrorBoundary fallbackSection="CtaSection">
          <CtaSection />
        </LandingErrorBoundary>
      </main>
      <LandingErrorBoundary fallbackSection="Footer">
        <Footer />
      </LandingErrorBoundary>
    </>
  );
}
