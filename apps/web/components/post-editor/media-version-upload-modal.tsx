"use client";

import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface MediaVersionUploadModalProps {
  mediaId: string;
  mediaFileName: string;
  currentFileUrl: string;
  relatedCommentId?: string;
  changeNotes?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MediaVersionUploadModal({
  mediaId,
  mediaFileName,
  currentFileUrl,
  relatedCommentId,
  changeNotes: initialNotes,
  onClose,
  onSuccess,
}: MediaVersionUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [changeNotes, setChangeNotes] = useState(initialNotes || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const createVersion = trpc.mediaVersions.createVersion.useMutation({
    onSuccess: () => {
      utils.mediaVersions.getVersions.invalidate({ mediaId });
      utils.mediaVersions.getPostVersions.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
      setUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen");
      return;
    }

    setFile(selected);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleUpload = async () => {
    if (!file || !changeNotes.trim()) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file to Supabase via /api/upload
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || "Error al subir archivo");
      }

      const data = await response.json();

      // 2. Create version in DB
      await createVersion.mutateAsync({
        mediaId,
        fileUrl: data.fileUrl || data.url,
        storagePath: data.storagePath || data.path,
        mimeType: file.type,
        fileSize: file.size,
        changeNotes: changeNotes.trim(),
        relatedCommentId,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al subir la versión"
      );
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              Nueva Versión de Imagen
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Related comment (if any) */}
          {initialNotes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 uppercase mb-1">
                Cambios solicitados
              </p>
              <p className="text-sm text-amber-900">{initialNotes}</p>
            </div>
          )}

          {/* Current vs New comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current image */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                Imagen actual
              </p>
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                <Image
                  src={currentFileUrl}
                  alt="Imagen actual"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* New image */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                Nueva versión
              </p>
              <div
                className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <Image
                    src={preview}
                    alt="Nueva versión"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">
                      Click para seleccionar
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file && (
            <p className="text-xs text-gray-500">
              {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          {/* Change notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe los cambios realizados *
            </label>
            <textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Ej: Aumenté el contraste y ajusté la saturación del fondo..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !changeNotes.trim() || uploading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Cargar Versión
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
