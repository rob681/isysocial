// ─── Holiday Data for Calendar ─────────────────────────────────────────────

export type HolidayRegion = "MX" | "US" | "LATAM";

export interface Holiday {
  date: string; // "MM-DD" format
  name: string;
  regions: HolidayRegion[];
}

export const HOLIDAYS: Holiday[] = [
  // ─── Enero ──────────────────────────────────────────────────
  { date: "01-01", name: "Año Nuevo", regions: ["MX", "US", "LATAM"] },
  { date: "01-06", name: "Día de Reyes", regions: ["MX", "LATAM"] },
  { date: "01-15", name: "Martin Luther King Jr. Day", regions: ["US"] },

  // ─── Febrero ────────────────────────────────────────────────
  { date: "02-05", name: "Día de la Constitución", regions: ["MX"] },
  { date: "02-14", name: "Día del Amor y la Amistad", regions: ["MX", "US", "LATAM"] },
  { date: "02-24", name: "Día de la Bandera", regions: ["MX"] },

  // ─── Marzo ──────────────────────────────────────────────────
  { date: "03-08", name: "Día Internacional de la Mujer", regions: ["MX", "LATAM"] },
  { date: "03-21", name: "Natalicio de Benito Juárez", regions: ["MX"] },

  // ─── Abril ──────────────────────────────────────────────────
  { date: "04-30", name: "Día del Niño", regions: ["MX"] },

  // ─── Mayo ───────────────────────────────────────────────────
  { date: "05-01", name: "Día del Trabajo", regions: ["MX", "LATAM"] },
  { date: "05-05", name: "Batalla de Puebla", regions: ["MX"] },
  { date: "05-10", name: "Día de las Madres", regions: ["MX"] },
  { date: "05-15", name: "Día del Maestro", regions: ["MX"] },
  { date: "05-27", name: "Memorial Day", regions: ["US"] },

  // ─── Junio ──────────────────────────────────────────────────
  { date: "06-15", name: "Día del Padre", regions: ["MX", "US"] },

  // ─── Julio ──────────────────────────────────────────────────
  { date: "07-04", name: "Independence Day", regions: ["US"] },

  // ─── Septiembre ─────────────────────────────────────────────
  { date: "09-01", name: "Labor Day", regions: ["US"] },
  { date: "09-15", name: "Grito de Independencia", regions: ["MX"] },
  { date: "09-16", name: "Día de la Independencia", regions: ["MX"] },

  // ─── Octubre ────────────────────────────────────────────────
  { date: "10-12", name: "Día de la Raza", regions: ["MX", "LATAM"] },
  { date: "10-31", name: "Halloween", regions: ["MX", "US", "LATAM"] },

  // ─── Noviembre ──────────────────────────────────────────────
  { date: "11-01", name: "Día de Muertos", regions: ["MX"] },
  { date: "11-02", name: "Día de los Fieles Difuntos", regions: ["MX"] },
  { date: "11-20", name: "Revolución Mexicana", regions: ["MX"] },
  { date: "11-28", name: "Thanksgiving", regions: ["US"] },
  { date: "11-29", name: "Black Friday", regions: ["MX", "US", "LATAM"] },

  // ─── Diciembre ──────────────────────────────────────────────
  { date: "12-12", name: "Día de la Virgen de Guadalupe", regions: ["MX"] },
  { date: "12-24", name: "Nochebuena", regions: ["MX", "LATAM"] },
  { date: "12-25", name: "Navidad", regions: ["MX", "US", "LATAM"] },
  { date: "12-28", name: "Día de los Santos Inocentes", regions: ["MX", "LATAM"] },
  { date: "12-31", name: "Fin de Año", regions: ["MX", "US", "LATAM"] },
];

export const HOLIDAY_REGION_LABELS: Record<HolidayRegion, string> = {
  MX: "México",
  US: "Estados Unidos",
  LATAM: "Latinoamérica",
};

/**
 * Get holidays for a specific month filtered by regions.
 * Returns a Map where key is "YYYY-MM-DD" and value is an array of holidays.
 */
export function getHolidaysForMonth(
  year: number,
  month: number,
  regions: HolidayRegion[]
): Map<string, Holiday[]> {
  const result = new Map<string, Holiday[]>();
  const monthStr = String(month).padStart(2, "0");

  for (const h of HOLIDAYS) {
    if (!h.regions.some((r) => regions.includes(r))) continue;
    if (!h.date.startsWith(monthStr + "-")) continue;

    const dayStr = h.date.split("-")[1];
    const fullDate = `${year}-${monthStr}-${dayStr}`;
    const existing = result.get(fullDate) || [];
    existing.push(h);
    result.set(fullDate, existing);
  }

  return result;
}
