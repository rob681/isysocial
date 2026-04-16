"use client";

import { useState } from "react";
import { IdeaBoard } from "@/components/ideas/idea-board";
import { Topbar } from "@/components/layout/topbar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClienteIdeasPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  function goToPrevMonth() {
    if (filterMonth === 1) {
      setFilterMonth(12);
      setFilterYear((y) => y - 1);
    } else {
      setFilterMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (filterYear === currentYear && filterMonth === currentMonth) return;
    if (filterMonth === 12) {
      setFilterMonth(1);
      setFilterYear((y) => y + 1);
    } else {
      setFilterMonth((m) => m + 1);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Ideas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ideas de contenido</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualiza las ideas de contenido y colabora con tu agencia
          </p>
        </div>
        {/* Month navigator */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={goToPrevMonth} className="p-1 rounded hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">
            {format(new Date(filterYear, filterMonth - 1), "MMMM yyyy", { locale: es })}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={filterYear === currentYear && filterMonth === currentMonth}
            className="p-1 rounded hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <IdeaBoard
        key={`${filterYear}-${filterMonth}`}
        basePath="/cliente/ideas"
        canCreate={true}
        canDrag={false}
        filterMonth={filterMonth}
        filterYear={filterYear}
      />
      </main>
    </div>
  );
}
