"use client";

import { useMemo, useRef, useState } from "react";

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
};

export default function Home() {
  const [length, setLength] = useState(220);
  const [width, setWidth] = useState(140);
  const [height, setHeight] = useState(70);
  const [thickness, setThickness] = useState(2);
  const [lidOverlap, setLidOverlap] = useState(30);
  const [glueTab, setGlueTab] = useState(12);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const dims = useMemo(() => {
    const L = Math.max(0, length);
    const W = Math.max(0, width);
    const H = Math.max(0, height);
    const T = Math.max(0, thickness);
    const O = Math.max(0, lidOverlap);
    const G = Math.max(0, glueTab);

    const panelL = L + 2 * T;
    const panelW = W + 2 * T;
    const panelH = H;

    const totalWidth = panelL + 2 * panelH + G;
    const totalHeight = O + 2 * panelW + 2 * panelH;

    const xBase = G + panelH;
    const yBase = O + panelW + panelH;

    return {
      L,
      W,
      H,
      T,
      O,
      G,
      panelL,
      panelW,
      panelH,
      totalWidth,
      totalHeight,
      xBase,
      yBase,
    };
  }, [length, width, height, thickness, lidOverlap, glueTab]);

  const handleDownload = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "box-net.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f2e8] text-zinc-900">
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(250,195,90,0.35),rgba(250,195,90,0))] blur-2xl" />
      <div className="pointer-events-none absolute left-[-20%] top-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(76,145,248,0.25),rgba(76,145,248,0))] blur-3xl" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 font-[var(--font-body)] lg:flex-row lg:items-start lg:gap-12">
        <section className="flex flex-1 flex-col gap-8">
          <header className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-600">
              makerthon prototype
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl lg:text-6xl font-[var(--font-display)]">
              Verpackungs-Template Generator
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-700">
              Wähl einen Produkt-Typ, gib die wichtigsten Maße ein, und erhalte
              sofort eine technische Zeichnung der Druckfläche. Für den Start
              ist ein Deckelbox-Typ hinterlegt.
            </p>
          </header>

          <div className="grid gap-6 rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(18,18,18,0.08)] backdrop-blur">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Produkt-Typ
              </label>
              <select className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm">
                <option>Box mit Klappdeckel (eineilige Stanze)</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Laenge (mm)
                </label>
                <input
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm"
                  type="number"
                  min={0}
                  value={length}
                  onChange={(event) => setLength(Number(event.target.value) || 0)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Breite (mm)
                </label>
                <input
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm"
                  type="number"
                  min={0}
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value) || 0)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Hoehe (mm)
                </label>
                <input
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm"
                  type="number"
                  min={0}
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value) || 0)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Materialstaerke (mm)
                </label>
                <input
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm"
                  type="number"
                  min={0}
                  value={thickness}
                  onChange={(event) => setThickness(Number(event.target.value) || 0)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Deckelueberstand (mm)
                </label>
                <input
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm"
                  type="number"
                  min={0}
                  value={lidOverlap}
                  onChange={(event) =>
                    setLidOverlap(Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Klebelasche (mm)
                </label>
                <input
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm"
                  type="number"
                  min={0}
                  value={glueTab}
                  onChange={(event) => setGlueTab(Number(event.target.value) || 0)}
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
                    {formatNumber(dims.L)} x {formatNumber(dims.W)} x{" "}
                    {formatNumber(dims.H)} mm
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Gesamtbogen
                  </p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {formatNumber(dims.totalWidth)} x{" "}
                    {formatNumber(dims.totalHeight)} mm
                  </p>
                </div>
              </div>
              <div className="text-xs leading-5 text-zinc-500">
                Formel-Auszug: Länge/ Breite der Flaechen = Innenmass + 2 *
                Materialstärke. Der Deckel besteht aus Deckelfläche +
                Deckelüberstand.
              </div>
            </div>
          </div>
        </section>

        <section className="flex w-full flex-1 flex-col gap-6">
          <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(18,18,18,0.08)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  vorschau
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900 font-[var(--font-display)]">
                  Technische Zeichnung
                </h2>
              </div>
              <button
                onClick={handleDownload}
                className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                type="button"
              >
                SVG download
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="aspect-[4/3] w-full">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${dims.totalWidth} ${dims.totalHeight}`}
                  className="h-full w-full"
                  role="img"
                  aria-label="Technische Zeichnung der Box"
                >
                  <rect
                    x={0}
                    y={0}
                    width={dims.totalWidth}
                    height={dims.totalHeight}
                    fill="#fafafa"
                  />

                  <rect
                    x={0}
                    y={dims.yBase}
                    width={dims.G}
                    height={dims.panelW}
                    fill="#f1e4ce"
                    stroke="#9d7f45"
                    strokeDasharray="6 5"
                  />

                  <rect
                    x={dims.G}
                    y={dims.yBase}
                    width={dims.panelH}
                    height={dims.panelW}
                    fill="#f7d6b5"
                    stroke="#8c5e2d"
                  />
                  <rect
                    x={dims.xBase}
                    y={dims.yBase}
                    width={dims.panelL}
                    height={dims.panelW}
                    fill="#fbead0"
                    stroke="#8c5e2d"
                  />
                  <rect
                    x={dims.xBase + dims.panelL}
                    y={dims.yBase}
                    width={dims.panelH}
                    height={dims.panelW}
                    fill="#f7d6b5"
                    stroke="#8c5e2d"
                  />

                  <rect
                    x={dims.xBase}
                    y={dims.yBase + dims.panelW}
                    width={dims.panelL}
                    height={dims.panelH}
                    fill="#f4c9a1"
                    stroke="#8c5e2d"
                  />

                  <rect
                    x={dims.xBase}
                    y={dims.yBase - dims.panelH}
                    width={dims.panelL}
                    height={dims.panelH}
                    fill="#f4c9a1"
                    stroke="#8c5e2d"
                  />

                  <rect
                    x={dims.xBase}
                    y={dims.yBase - dims.panelH - dims.panelW}
                    width={dims.panelL}
                    height={dims.panelW}
                    fill="#f6dfc1"
                    stroke="#8c5e2d"
                  />

                  <rect
                    x={dims.xBase}
                    y={dims.yBase - dims.panelH - dims.panelW - dims.O}
                    width={dims.panelL}
                    height={dims.O}
                    fill="#f1e4ce"
                    stroke="#9d7f45"
                    strokeDasharray="6 5"
                  />

                  <g
                    fontFamily="var(--font-body)"
                    fontSize={Math.max(10, dims.totalWidth / 60)}
                    fill="#4a3b21"
                  >
                    <text
                      x={dims.xBase + dims.panelL / 2}
                      y={dims.yBase + dims.panelW / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      Boden
                    </text>
                    <text
                      x={dims.xBase + dims.panelL / 2}
                      y={dims.yBase + dims.panelW + dims.panelH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      Front
                    </text>
                    <text
                      x={dims.xBase + dims.panelL / 2}
                      y={dims.yBase - dims.panelH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      Rueckwand
                    </text>
                    <text
                      x={dims.xBase + dims.panelL / 2}
                      y={dims.yBase - dims.panelH - dims.panelW / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      Deckel
                    </text>
                  </g>

                  <g
                    stroke="#8c5e2d"
                    strokeDasharray="8 6"
                    strokeWidth={1}
                  >
                    <line
                      x1={dims.G}
                      y1={dims.yBase}
                      x2={dims.G}
                      y2={dims.yBase + dims.panelW}
                    />
                    <line
                      x1={dims.xBase}
                      y1={dims.yBase}
                      x2={dims.xBase}
                      y2={dims.yBase + dims.panelW}
                    />
                    <line
                      x1={dims.xBase + dims.panelL}
                      y1={dims.yBase}
                      x2={dims.xBase + dims.panelL}
                      y2={dims.yBase + dims.panelW}
                    />
                    <line
                      x1={dims.xBase}
                      y1={dims.yBase}
                      x2={dims.xBase + dims.panelL}
                      y2={dims.yBase}
                    />
                    <line
                      x1={dims.xBase}
                      y1={dims.yBase + dims.panelW}
                      x2={dims.xBase + dims.panelL}
                      y2={dims.yBase + dims.panelW}
                    />
                    <line
                      x1={dims.xBase}
                      y1={dims.yBase - dims.panelH}
                      x2={dims.xBase + dims.panelL}
                      y2={dims.yBase - dims.panelH}
                    />
                    <line
                      x1={dims.xBase}
                      y1={dims.yBase - dims.panelH - dims.panelW}
                      x2={dims.xBase + dims.panelL}
                      y2={dims.yBase - dims.panelH - dims.panelW}
                    />
                  </g>
                </svg>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Wichtige Flaechen
                </p>
                <p className="mt-2 font-semibold text-zinc-900">
                  Boden: {formatNumber(dims.panelL)} x {formatNumber(dims.panelW)}
                  mm
                </p>
                <p className="text-zinc-600">
                  Seiten: {formatNumber(dims.panelH)} x {formatNumber(dims.panelW)}
                  mm
                </p>
                <p className="text-zinc-600">
                  Front/Rückwand: {formatNumber(dims.panelL)} x{" "}
                  {formatNumber(dims.panelH)} mm
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Deckel
                </p>
                <p className="mt-2 font-semibold text-zinc-900">
                  Deckelflaeche: {formatNumber(dims.panelL)} x{" "}
                  {formatNumber(dims.panelW)} mm
                </p>
                <p className="text-zinc-600">
                  Überstand: {formatNumber(dims.panelL)} x {formatNumber(dims.O)}
                  mm
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
