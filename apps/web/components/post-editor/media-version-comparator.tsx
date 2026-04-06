"use client";

import React, { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import Image from "next/image";
import { Clock, User, MessageSquare, Layers } from "lucide-react";

interface MediaVersionComparatorProps {
  mediaId: string;
  currentFileUrl: string;
  fileName: string;
}

export function MediaVersionComparator({
  mediaId,
  currentFileUrl,
  fileName,
}: MediaVersionComparatorProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [beforeIdx, setBeforeIdx] = useState(0);
  const [afterIdx, setAfterIdx] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: versions, isLoading } =
    trpc.mediaVersions.getVersions.useQuery(
      { mediaId },
      { enabled: !!mediaId }
    );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    [isDragging]
  );

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-20 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando historial...</p>
      </div>
    );
  }

  if (!versions || versions.length < 2) {
    return null; // Don't show if no version history
  }

  const beforeVersion = versions[beforeIdx];
  const afterVersion = versions[afterIdx];

  if (!beforeVersion || !afterVersion) return null;

  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900">
            Historial de Imagen
          </h4>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {versions.length} versiones
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate max-w-[200px]">
          {fileName}
        </p>
      </div>

      {/* Version selectors */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50/50 border-b text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-orange-400" />
          <label className="font-medium text-gray-700">Antes:</label>
          <select
            value={beforeIdx}
            onChange={(e) => setBeforeIdx(Number(e.target.value))}
            className="border rounded px-2 py-1 text-xs bg-white"
          >
            {versions.map((v, i) => (
              <option key={v.id} value={i} disabled={i === afterIdx}>
                V{v.versionNumber} — {v.changedBy.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          <label className="font-medium text-gray-700">Ahora:</label>
          <select
            value={afterIdx}
            onChange={(e) => setAfterIdx(Number(e.target.value))}
            className="border rounded px-2 py-1 text-xs bg-white"
          >
            {versions.map((v, i) => (
              <option key={v.id} value={i} disabled={i === beforeIdx}>
                V{v.versionNumber} — {v.changedBy.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparator slider */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square max-h-[500px] bg-gray-100 cursor-col-resize select-none overflow-hidden"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleMouseMove}
      >
        {/* After image (full background) */}
        <div className="absolute inset-0">
          <Image
            src={afterVersion.fileUrl}
            alt={`Versión ${afterVersion.versionNumber}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Before image (clipped by slider) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="relative w-full h-full" style={{ width: `${(100 / sliderPos) * 100}%` }}>
            <Image
              src={beforeVersion.fileUrl}
              alt={`Versión ${beforeVersion.versionNumber}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-10"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-600"
            >
              <path
                d="M5 3L2 8L5 13M11 3L14 8L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow z-10">
          Antes
        </div>
        <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow z-10">
          Ahora
        </div>
      </div>

      {/* Version details cards */}
      <div className="grid grid-cols-2 gap-0 border-t">
        {/* Before card */}
        <div className="p-3 border-r border-l-4 border-l-orange-400">
          <p className="text-xs font-semibold text-orange-600 uppercase mb-1">
            Antes — V{beforeVersion.versionNumber}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
            <User className="w-3 h-3" />
            <span>{beforeVersion.changedBy.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(beforeVersion.createdAt).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {beforeVersion.changeNotes && (
            <div className="flex items-start gap-1.5 text-xs text-gray-700 mt-1 bg-orange-50 rounded p-1.5">
              <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="italic">{beforeVersion.changeNotes}</span>
            </div>
          )}
        </div>

        {/* After card */}
        <div className="p-3 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">
            Ahora — V{afterVersion.versionNumber}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
            <User className="w-3 h-3" />
            <span>{afterVersion.changedBy.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(afterVersion.createdAt).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {afterVersion.changeNotes && (
            <div className="flex items-start gap-1.5 text-xs text-gray-700 mt-1 bg-blue-50 rounded p-1.5">
              <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="italic">{afterVersion.changeNotes}</span>
            </div>
          )}
          {afterVersion.relatedComment && (
            <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded p-1.5">
              <span className="font-medium">Cambio solicitado:</span>{" "}
              {afterVersion.relatedComment.content.length > 80
                ? afterVersion.relatedComment.content.slice(0, 80) + "..."
                : afterVersion.relatedComment.content}
            </div>
          )}
        </div>
      </div>

      {/* Timeline strip */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <div className="flex items-center gap-2 overflow-x-auto">
          {versions.map((v, i) => (
            <button
              key={v.id}
              onClick={() => {
                if (i < versions.length - 1) {
                  setBeforeIdx(i);
                  setAfterIdx(i + 1);
                } else {
                  setBeforeIdx(i - 1);
                  setAfterIdx(i);
                }
              }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 overflow-hidden transition-all ${
                i === beforeIdx || i === afterIdx
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={v.fileUrl}
                alt={`V${v.versionNumber}`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
