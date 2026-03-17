"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollAnimation } from "./scroll-animation";

export function MidCta() {
  return (
    <section className="py-16">
      <div className="container-landing">
        <ScrollAnimation>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 glass-card p-8 md:p-12 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  Empieza a publicar en minutos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Conecta tus redes, sube tu contenido y programa. Asi de
                  simple.
                </p>
              </div>
            </div>
            <Link href="/registro" className="flex-shrink-0">
              <Button
                size="lg"
                className="gradient-primary text-white font-semibold shadow-md hover:opacity-90 transition-opacity h-11 px-6"
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
