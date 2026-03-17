"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  Clock,
  CreditCard,
  Calendar,
  BarChart3,
  ThumbsUp,
  Send,
  Image,
  Instagram,
  Facebook,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 md:pt-0">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/3 -left-1/4 w-[700px] h-[700px] rounded-full bg-[hsl(221,83%,53%)] opacity-[0.06] blur-[120px]" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-[hsl(174,84%,39%)] opacity-[0.06] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[hsl(262,83%,58%)] opacity-[0.03] blur-[100px]" />
      </div>

      <div className="container-landing relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="text-center lg:text-left"
          >
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-card/60 backdrop-blur-sm text-sm font-medium text-muted-foreground mb-6">
                <span className="w-2 h-2 rounded-full gradient-primary animate-pulse" />
                Gestion de redes sociales para agencias
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              Publica, aprueba y mide{" "}
              <span className="gradient-text">tus redes sociales</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              La plataforma todo-en-uno para agencias que gestionan contenido en
              redes sociales. Calendario editorial, aprobaciones de clientes y
              publicacion directa desde un solo lugar.
            </motion.p>

            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
            >
              <Link href="/registro">
                <Button
                  size="lg"
                  className="gradient-primary text-white font-semibold shadow-lg hover:opacity-90 transition-opacity h-12 px-8 text-base w-full sm:w-auto"
                >
                  Prueba gratis 14 dias
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#precios">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base w-full sm:w-auto"
                >
                  Ver precios
                </Button>
              </a>
            </motion.div>

            <motion.div
              variants={item}
              className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-green-500" />
                Sin tarjeta de credito
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-500" />
                14 dias gratis
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-purple-500" />
                Cancela cuando quieras
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.4,
              ease: [0.21, 0.47, 0.32, 0.98],
            }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="glass-card shadow-soft p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg">Calendario Editorial</h3>
                    <p className="text-sm text-muted-foreground">
                      Marzo 2026
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    {
                      icon: <Calendar className="h-4 w-4" />,
                      label: "Programados",
                      value: "18",
                      color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
                    },
                    {
                      icon: <ThumbsUp className="h-4 w-4" />,
                      label: "Aprobados",
                      value: "12",
                      color: "text-green-500 bg-green-100 dark:bg-green-900/30",
                    },
                    {
                      icon: <BarChart3 className="h-4 w-4" />,
                      label: "Engagement",
                      value: "4.2%",
                      color:
                        "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border bg-card/50 p-3"
                    >
                      <div
                        className={`inline-flex p-1.5 rounded-lg ${stat.color} mb-2`}
                      >
                        {stat.icon}
                      </div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    {
                      title: "Promo Black Friday",
                      network: "Instagram",
                      icon: <Instagram className="h-3.5 w-3.5" />,
                      status: "Aprobado",
                      color: "bg-green-500",
                    },
                    {
                      title: "Video testimonial",
                      network: "Facebook",
                      icon: <Facebook className="h-3.5 w-3.5" />,
                      status: "En revision",
                      color: "bg-amber-500",
                    },
                    {
                      title: "Carrusel de tips",
                      network: "Instagram",
                      icon: <Image className="h-3.5 w-3.5" />,
                      status: "Programado",
                      color: "bg-blue-500",
                    },
                  ].map((post) => (
                    <div
                      key={post.title}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">{post.icon}</div>
                        <div>
                          <span className="text-sm font-medium block">
                            {post.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {post.network}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full text-white ${post.color}`}
                      >
                        {post.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 glass-card shadow-soft p-3 rounded-xl animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                    <Send className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Post publicado</p>
                    <p className="text-[10px] text-muted-foreground">
                      Hace 2 min
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -top-3 -right-3 glass-card shadow-soft p-3 rounded-xl animate-float-delayed">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Cliente aprobo</p>
                    <p className="text-[10px] text-muted-foreground">
                      Studio Lumina
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
