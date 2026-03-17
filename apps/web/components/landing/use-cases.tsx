"use client";

import {
  Building2,
  Megaphone,
  Camera,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";

const useCases = [
  {
    icon: <Megaphone className="h-7 w-7" />,
    title: "Agencias de marketing digital",
    description:
      "Centraliza la gestion de contenido de todos tus clientes. Programa, aprueba y publica sin cambiar de herramienta.",
    color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
    features: [
      "Calendario editorial multi-cliente",
      "Flujos de aprobacion automatizados",
      "Reportes de rendimiento por cuenta",
    ],
  },
  {
    icon: <Camera className="h-7 w-7" />,
    title: "Creadores de contenido",
    description:
      "Planifica tu contenido con anticipacion, genera ideas con IA y mide el impacto de cada publicacion.",
    color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
    features: [
      "Banco de ideas con IA generativa",
      "Programacion en todas las redes",
      "Metricas de crecimiento y engagement",
    ],
  },
  {
    icon: <Building2 className="h-7 w-7" />,
    title: "Equipos de comunicacion corporativa",
    description:
      "Mantiene la coherencia de marca en todas las plataformas con kits de marca y tono de voz definidos.",
    color: "text-green-500 bg-green-100 dark:bg-green-900/30",
    features: [
      "Kit de marca centralizado",
      "Aprobacion por jerarquia",
      "Consistencia visual automatica",
    ],
  },
  {
    icon: <UserCheck className="h-7 w-7" />,
    title: "Freelancers y consultores",
    description:
      "Demuestra valor a tus clientes con reportes profesionales y un portal donde ellos mismos pueden aprobar contenido.",
    color: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
    features: [
      "Portal de cliente profesional",
      "Reportes automaticos en PDF",
      "Gestion de multiples marcas",
    ],
  },
];

export function UseCases() {
  return (
    <section id="casos-de-uso" className="section-padding">
      <div className="container-landing">
        <ScrollAnimation className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Disenado para{" "}
            <span className="gradient-text">quienes crean contenido</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sin importar el tamano de tu equipo, Isysocial se adapta a tu forma
            de trabajar.
          </p>
        </ScrollAnimation>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {useCases.map((useCase, index) => (
            <ScrollAnimation
              key={useCase.title}
              delay={index * 0.1}
              direction={index % 2 === 0 ? "left" : "right"}
            >
              <div className="glass-card card-hover p-6 md:p-8 h-full">
                <div
                  className={`inline-flex p-3 rounded-xl ${useCase.color} mb-4`}
                >
                  {useCase.icon}
                </div>
                <h3 className="font-bold text-xl mb-2">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {useCase.description}
                </p>
                <ul className="space-y-2">
                  {useCase.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  );
}
