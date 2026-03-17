"use client";

import {
  Calendar,
  Send,
  BarChart3,
  Users,
  Palette,
  MessageSquare,
  Sparkles,
  Globe,
} from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";

const features = [
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "Calendario editorial",
    description:
      "Visualiza y organiza todo tu contenido en un calendario estilo Hootsuite. Arrastra, programa y publica.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Publicacion directa",
    description:
      "Publica automaticamente en Facebook, Instagram, LinkedIn, X y TikTok desde un solo panel.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Aprobacion de clientes",
    description:
      "Tus clientes revisan y aprueban contenido antes de publicar. Sin emails, sin WhatsApp, sin caos.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Metricas unificadas",
    description:
      "Analiza el rendimiento de todas tus redes en un solo dashboard con reportes automaticos.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Asistente de IA",
    description:
      "Genera copy, hashtags y sugerencias de contenido con inteligencia artificial integrada.",
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Branding por cliente",
    description:
      "Cada cliente tiene su kit de marca: colores, tipografias y tono de voz para contenido consistente.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Banco de ideas",
    description:
      "Captura, organiza y convierte ideas en contenido listo para publicar. Nunca pierdas una buena idea.",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Multi-cliente",
    description:
      "Gestiona todas las cuentas de tus clientes desde un solo lugar con permisos y roles por equipo.",
  },
];

export function Features() {
  return (
    <section id="funciones" className="section-padding bg-muted/30">
      <div className="container-landing">
        <ScrollAnimation className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Todo lo que necesitas para{" "}
            <span className="gradient-text">gestionar redes sociales</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Herramientas disenadas para agencias que manejan multiples cuentas y
            necesitan resultados medibles.
          </p>
        </ScrollAnimation>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <ScrollAnimation key={feature.title} delay={index * 0.05}>
              <div className="glass-card card-hover p-6 h-full">
                <div className="inline-flex p-2.5 rounded-xl bg-primary/10 mb-4">
                  <span className="gradient-text">{feature.icon}</span>
                </div>
                <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  );
}
