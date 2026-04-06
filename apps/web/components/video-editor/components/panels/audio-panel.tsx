"use client";

import { Upload, Volume2, VolumeX, Trash2, Music } from "lucide-react";
import type { AudioTrack } from "../../types";

interface AudioPanelProps {
  audioTrack: AudioTrack | null;
  onLoadAudio: (file: File) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onRemove: () => void;
}

export function AudioPanel({ audioTrack, onLoadAudio, onVolumeChange, onMuteToggle, onRemove }: AudioPanelProps) {
  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onLoadAudio(file);
    };
    input.click();
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Audio</h3>

      {!audioTrack ? (
        <>
          <p className="text-[11px] text-zinc-400">
            Agrega música de fondo a tu video. Se reproducirá sincronizada con el video.
          </p>
          <button
            onClick={handleFileSelect}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-primary/50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Upload className="h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
              Subir archivo de audio
            </span>
            <span className="text-[10px] text-zinc-600">MP3, WAV, OGG</span>
          </button>
        </>
      ) : (
        <>
          {/* Audio file info */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700">
            <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Music className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white truncate">{audioTrack.name}</p>
              <p className="text-[10px] text-zinc-400">Música de fondo</p>
            </div>
          </div>

          {/* Volume control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-zinc-400">Volumen</label>
              <span className="text-[11px] font-mono text-zinc-300">{Math.round(audioTrack.volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onMuteToggle} className="text-zinc-400 hover:text-white transition-colors">
                {audioTrack.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audioTrack.volume * 100)}
                onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
                className="flex-1 accent-primary h-1.5"
              />
            </div>
          </div>

          {/* Remove */}
          <button
            onClick={onRemove}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs"
          >
            <Trash2 className="h-3 w-3" /> Quitar audio
          </button>
        </>
      )}
    </div>
  );
}
