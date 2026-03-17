"use client";

import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  CheckCircle2,
  Instagram,
  Facebook,
  Image,
  Heart,
  Send,
} from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";

const pendingPosts = [
  {
    network: "Instagram",
    icon: <Instagram className="h-4 w-4 text-pink-500" />,
    type: "Carrusel",
    title: "5 tips para tu marca personal",
    date: "Mar 18, 10:00 AM",
    image: "bg-gradient-to-br from-pink-400 to-purple-500",
  },
  {
    network: "Facebook",
    icon: <Facebook className="h-4 w-4 text-blue-600" />,
    type: "Video",
    title: "Detras de camaras - sesion de fotos",
    date: "Mar 19, 2:00 PM",
    image: "bg-gradient-to-br from-blue-400 to-cyan-500",
  },
  {
    network: "Instagram",
    icon: <Instagram className="h-4 w-4 text-pink-500" />,
    type: "Reel",
    title: "Promo especial de primavera",
    date: "Mar 20, 11:00 AM",
    image: "bg-gradient-to-br from-orange-400 to-red-500",
  },
];

export function ClientPortal() {
  return (
    <section className="section-padding">
      <div className="container-landing">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <ScrollAnimation direction="left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-card/60 backdrop-blur-sm text-sm font-medium text-muted-foreground mb-6">
              <Eye className="h-4 w-4" />
              Vista del cliente
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Asi ven tus clientes{" "}
              <span className="gradient-text">su contenido</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Tus clientes acceden a su propio portal donde revisan, aprueban o
              rechazan contenido antes de publicar. Sin emails, sin WhatsApp,
              sin confusiones.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: <ThumbsUp className="h-5 w-5 text-green-500" />,
                  title: "Aprueban con un clic",
                  description:
                    "El cliente ve la vista previa exacta del post y aprueba o solicita cambios al instante.",
                },
                {
                  icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
                  title: "Comentarios en contexto",
                  description:
                    "Los comentarios quedan directamente en el post, no en un hilo de email perdido.",
                },
                {
                  icon: <Clock className="h-5 w-5 text-purple-500" />,
                  title: "Calendario transparente",
                  description:
                    "Ven exactamente que se publica, cuando y en que red social. Total visibilidad.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimation>

          {/* Right: Client Portal Mockup */}
          <ScrollAnimation direction="right">
            <div className="relative">
              {/* Browser chrome */}
              <div className="glass-card shadow-soft rounded-2xl overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-card/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-muted/50 rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                      isysocial.com/cliente/contenido
                    </div>
                  </div>
                </div>

                {/* Portal content */}
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-bold text-base">
                        Mi Contenido
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        3 posts pendientes de aprobacion
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Pendientes
                      </span>
                    </div>
                  </div>

                  {/* Post cards */}
                  <div className="space-y-3">
                    {pendingPosts.map((post, index) => (
                      <div
                        key={post.title}
                        className="rounded-xl border bg-card/40 p-3 transition-all"
                      >
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          <div
                            className={`w-16 h-16 rounded-lg ${post.image} flex items-center justify-center flex-shrink-0`}
                          >
                            <Image className="h-6 w-6 text-white/80" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {post.icon}
                              <span className="text-xs text-muted-foreground">
                                {post.network} &middot; {post.type}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {post.date}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            {index === 0 ? (
                              <>
                                <button className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                                  <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </button>
                                <button className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                                  <ThumbsDown className="h-4 w-4 text-red-500 dark:text-red-400" />
                                </button>
                              </>
                            ) : index === 1 ? (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium whitespace-nowrap">
                                Aprobado
                              </span>
                            ) : (
                              <button className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comment area for first post */}
                        {index === 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                  CL
                                </span>
                              </div>
                              <div className="flex-1 bg-muted/30 rounded-lg px-3 py-2">
                                <p className="text-xs text-muted-foreground">
                                  Me encanta el diseno! Solo cambiar el color
                                  del titulo a azul.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Stats bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-sm font-bold">24</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Aprobados
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-pink-500" />
                        <span className="text-sm font-bold">1.2k</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Likes totales
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Send className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-sm font-bold">31</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Publicados
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -bottom-3 -left-3 glass-card shadow-soft p-3 rounded-xl animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Post aprobado</p>
                    <p className="text-[10px] text-muted-foreground">
                      Por el cliente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
