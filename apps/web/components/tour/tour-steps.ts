import type { DriveStep } from "driver.js";

/* ─────────────────── ADMIN TOUR ─────────────────── */
export const adminTourSteps: DriveStep[] = [
  {
    popover: {
      title: "Bienvenido a Isysocial",
      description:
        "Este tour te guiara por las funciones principales de la plataforma. Solo tomara un minuto.",
      side: "over" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Navegacion principal",
      description:
        "Aqui encontraras todas las secciones: Dashboard, Aprobaciones, Clientes, Equipo y mas.",
      side: "right" as any,
      align: "start" as any,
    },
  },
  {
    element: '[data-tour="sidebar-dashboard"]',
    popover: {
      title: "Dashboard",
      description:
        "Tu panel principal con estadisticas, publicaciones pendientes, actividad reciente y calendario.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-approvals"]',
    popover: {
      title: "Aprobaciones",
      description:
        "Revisa y aprueba las publicaciones creadas por tu equipo antes de publicarlas.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-clients"]',
    popover: {
      title: "Clientes",
      description:
        "Gestiona tus clientes, sus perfiles, marcas y contenido asignado.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-team"]',
    popover: {
      title: "Equipo",
      description:
        "Administra los editores y colaboradores de tu agencia. Invita nuevos miembros desde aqui.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-content"]',
    popover: {
      title: "Contenido",
      description:
        "Crea, edita y gestiona todas las publicaciones. Puedes alternar entre vista de lista y cuadricula.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-calendar"]',
    popover: {
      title: "Calendario",
      description:
        "Visualiza tu contenido programado en un calendario mensual para planificar mejor.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-settings"]',
    popover: {
      title: "Configuracion",
      description:
        "Personaliza tu agencia: logo, colores, categorias y ajustes generales.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    popover: {
      title: "Listo para comenzar!",
      description:
        "Ya conoces lo basico. Explora cada seccion para descubrir todas las herramientas disponibles. Puedes volver a ver este tour desde tu perfil.",
      side: "over" as any,
      align: "center" as any,
    },
  },
];

/* ─────────────────── EDITOR TOUR ─────────────────── */
export const editorTourSteps: DriveStep[] = [
  {
    popover: {
      title: "Bienvenido a Isysocial",
      description:
        "Te mostraremos las herramientas principales para gestionar el contenido de tus clientes.",
      side: "over" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Navegacion",
      description:
        "Desde aqui accedes a tu dashboard, contenido, calendario y la lista de clientes asignados.",
      side: "right" as any,
      align: "start" as any,
    },
  },
  {
    element: '[data-tour="sidebar-dashboard"]',
    popover: {
      title: "Tu Dashboard",
      description:
        "Resumen de tus tareas pendientes, publicaciones recientes y estadisticas de contenido.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-content"]',
    popover: {
      title: "Mis Contenidos",
      description:
        "Aqui creas y gestionas las publicaciones de tus clientes. Usa el asistente de IA para generar copys.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-calendar"]',
    popover: {
      title: "Calendario",
      description:
        "Ve las publicaciones programadas de todos tus clientes en una vista mensual.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    popover: {
      title: "Listo!",
      description:
        "Ya puedes comenzar a crear contenido. Selecciona un cliente y crea tu primera publicacion.",
      side: "over" as any,
      align: "center" as any,
    },
  },
];

/* ─────────────────── CLIENTE TOUR ─────────────────── */
export const clientTourSteps: DriveStep[] = [
  {
    popover: {
      title: "Bienvenido a Isysocial",
      description:
        "Te mostraremos como revisar y aprobar el contenido que tu agencia crea para ti.",
      side: "over" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Menu de navegacion",
      description:
        "Accede a tu contenido, calendario, ideas y configuracion de marca.",
      side: "right" as any,
      align: "start" as any,
    },
  },
  {
    element: '[data-tour="sidebar-dashboard"]',
    popover: {
      title: "Inicio",
      description:
        "Tu panel principal con resumen de publicaciones pendientes de aprobacion y actividad reciente.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-content"]',
    popover: {
      title: "Mi Contenido",
      description:
        "Revisa todas las publicaciones de tu marca. Puedes aprobar, solicitar cambios o dejar comentarios.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-calendar"]',
    popover: {
      title: "Calendario",
      description:
        "Visualiza tu contenido programado por fecha para tener una vision clara de tu estrategia.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-ideas"]',
    popover: {
      title: "Ideas",
      description:
        "Comparte ideas y referencias con tu agencia para inspirar nuevas publicaciones.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    element: '[data-tour="sidebar-brand"]',
    popover: {
      title: "Mi Marca",
      description:
        "Define los colores, tipografia, tono de voz y estrategia de tu marca. Tu agencia usara esto como guia.",
      side: "right" as any,
      align: "center" as any,
    },
  },
  {
    popover: {
      title: "Listo!",
      description:
        "Ya puedes revisar tu contenido. Si tienes dudas, deja un comentario en cualquier publicacion.",
      side: "over" as any,
      align: "center" as any,
    },
  },
];
