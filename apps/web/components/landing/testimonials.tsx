"use client";

import { Star } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";

const testimonials = [
  {
    quote:
      "Antes usabamos tres herramientas distintas para gestionar las redes de nuestros clientes. Con Isysocial tenemos todo en un solo lugar y nuestros clientes aprueban contenido sin mandarnos mensajes.",
    name: "Carolina Mendez",
    role: "Directora Creativa",
    company: "Estudio Lumina",
    initials: "CM",
    rating: 5,
  },
  {
    quote:
      "El calendario editorial cambio nuestra forma de trabajar. Programamos todo el mes en un dia y el flujo de aprobacion nos ahorra horas de idas y vueltas con los clientes.",
    name: "Andres Rios",
    role: "CEO",
    company: "RioMedia Agency",
    initials: "AR",
    rating: 5,
  },
  {
    quote:
      "La integracion con todas las redes sociales es impresionante. Publicamos en Instagram, Facebook, LinkedIn y TikTok sin salir de la plataforma. Los reportes automaticos son un plus enorme.",
    name: "Valentina Torres",
    role: "Social Media Manager",
    company: "Grupo Nexo Digital",
    initials: "VT",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonios" className="section-padding bg-muted/30">
      <div className="container-landing">
        <ScrollAnimation className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Lo que dicen{" "}
            <span className="gradient-text">nuestros usuarios</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Agencias y creadores que transformaron su gestion de redes sociales.
          </p>
        </ScrollAnimation>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <ScrollAnimation key={testimonial.name} delay={index * 0.1}>
              <div className="glass-card card-hover p-6 md:p-8 h-full flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  );
}
