"use client";

import { formatNumber } from "./formatters";
import type { BoxInputsProps } from "./types";

export function BoxInputs({
  length,
  width,
  height,
  thickness,
  lidOverlap,
  glueTab,
  dims,
  mode,
  fileName,
  onLengthChange,
  onWidthChange,
  onHeightChange,
  onThicknessChange,
  onLidOverlapChange,
  onGlueTabChange,
  onModeChange,
  onFileUpload,
  onClearUpload,
}: BoxInputsProps) {
  return (
    <div className="grid gap-5 rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(18,18,18,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Produkt-Typ
        </label>
        <select className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm">
          <option>Magnetbox (Book-Style)</option>
        </select>
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Template Quelle
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onModeChange("preset")}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
              mode === "preset"
                ? "border-zinc-800 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            }`}
          >
            Preset
          </button>
          <button
            type="button"
            onClick={() => onModeChange("upload")}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
              mode === "upload"
                ? "border-zinc-800 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            }`}
          >
            DXF Upload
          </button>
        </div>
        {mode === "upload" && (
          <div className="grid gap-2">
            <input
              type="file"
              accept=".dxf"
              onChange={(event) =>
                onFileUpload(event.target.files?.[0] ?? null)
              }
              className="text-xs"
            />
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{fileName ? `Aktiv: ${fileName}` : "Keine Datei geladen"}</span>
              {fileName && (
                <button
                  type="button"
                  onClick={onClearUpload}
                  className="text-xs font-semibold uppercase tracking-widest text-zinc-600 hover:text-zinc-900"
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Laenge (mm)
          </label>
          <input
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
            type="number"
            min={0}
            value={length}
            onChange={(event) => onLengthChange(Number(event.target.value) || 0)}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Breite (mm)
          </label>
          <input
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
            type="number"
            min={0}
            value={width}
            onChange={(event) => onWidthChange(Number(event.target.value) || 0)}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Hoehe (mm)
          </label>
          <input
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
            type="number"
            min={0}
            value={height}
            onChange={(event) => onHeightChange(Number(event.target.value) || 0)}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Materialstaerke (mm)
          </label>
          <input
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
            type="number"
            min={0}
            value={thickness}
            onChange={(event) => onThicknessChange(Number(event.target.value) || 0)}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Deckelueberstand (mm)
          </label>
          <input
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
            type="number"
            min={0}
            value={lidOverlap}
            onChange={(event) => onLidOverlapChange(Number(event.target.value) || 0)}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Klebelasche (mm)
          </label>
          <input
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
            type="number"
            min={0}
            value={glueTab}
            onChange={(event) => onGlueTabChange(Number(event.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Innenmass
            </p>
            <p className="text-lg font-semibold text-zinc-900">
              {formatNumber(dims.L)} x {formatNumber(dims.W)} x {formatNumber(dims.H)}
              mm
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Gesamtbogen
            </p>
            <p className="text-lg font-semibold text-zinc-900">
              {formatNumber(dims.totalWidth)} x {formatNumber(dims.totalHeight)} mm
            </p>
          </div>
        </div>
        <div className="text-xs leading-5 text-zinc-500">
          Formel-Auszug: Laenge/ Breite der Flaechen = Innenmass + 2 *
          Materialstaerke. Der Deckel besteht aus Deckelflaeche +
          Deckelueberstand.
        </div>
      </div>
    </div>
  );
}
