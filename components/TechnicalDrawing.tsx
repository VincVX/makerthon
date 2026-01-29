"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DxfViewer } from "dxf-viewer";
import { useDxfContext } from "./DxfContext";
import { formatNumber } from "./formatters";
import type { BoxDimensions } from "./types";

interface TechnicalDrawingProps {
  dims: BoxDimensions;
  onDxfBounds?: (bounds: { width: number; height: number } | null) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const INSUNITS_SCALE_TO_MM: Record<number, number> = {
  1: 25.4, // inches
  2: 304.8, // feet
  4: 1, // mm
  5: 10, // cm
  6: 1000, // meters
};

const getUnitScale = (insUnits?: number) => {
  if (!insUnits) return 1;
  return INSUNITS_SCALE_TO_MM[insUnits] ?? 1;
};

const buildRectPath = (x: number, y: number, w: number, h: number) =>
  `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;

const buildLinePath = (x1: number, y1: number, x2: number, y2: number) =>
  `M ${x1} ${y1} L ${x2} ${y2}`;

const buildDielinePaths = (dims: BoxDimensions) => {
  const cutSegments: string[] = [];
  const creaseSegments: string[] = [];

  cutSegments.push(buildRectPath(0, dims.yBase, dims.G, dims.panelW));
  cutSegments.push(buildRectPath(dims.G, dims.yBase, dims.panelH, dims.panelW));
  cutSegments.push(
    buildRectPath(dims.xBase, dims.yBase, dims.panelL, dims.panelW)
  );
  cutSegments.push(
    buildRectPath(dims.xBase + dims.panelL, dims.yBase, dims.panelH, dims.panelW)
  );
  cutSegments.push(
    buildRectPath(dims.xBase, dims.yBase + dims.panelW, dims.panelL, dims.panelH)
  );
  cutSegments.push(
    buildRectPath(dims.xBase, dims.yBase - dims.panelH, dims.panelL, dims.panelH)
  );
  cutSegments.push(
    buildRectPath(
      dims.xBase,
      dims.yBase - dims.panelH - dims.panelW,
      dims.panelL,
      dims.panelW
    )
  );
  cutSegments.push(
    buildRectPath(
      dims.xBase,
      dims.yBase - dims.panelH - dims.panelW - dims.O,
      dims.panelL,
      dims.O
    )
  );

  creaseSegments.push(
    buildLinePath(dims.G, dims.yBase, dims.G, dims.yBase + dims.panelW)
  );
  creaseSegments.push(
    buildLinePath(dims.xBase, dims.yBase, dims.xBase, dims.yBase + dims.panelW)
  );
  creaseSegments.push(
    buildLinePath(
      dims.xBase + dims.panelL,
      dims.yBase,
      dims.xBase + dims.panelL,
      dims.yBase + dims.panelW
    )
  );
  creaseSegments.push(
    buildLinePath(dims.xBase, dims.yBase, dims.xBase + dims.panelL, dims.yBase)
  );
  creaseSegments.push(
    buildLinePath(
      dims.xBase,
      dims.yBase + dims.panelW,
      dims.xBase + dims.panelL,
      dims.yBase + dims.panelW
    )
  );
  creaseSegments.push(
    buildLinePath(
      dims.xBase,
      dims.yBase - dims.panelH,
      dims.xBase + dims.panelL,
      dims.yBase - dims.panelH
    )
  );
  creaseSegments.push(
    buildLinePath(
      dims.xBase,
      dims.yBase - dims.panelH - dims.panelW,
      dims.xBase + dims.panelL,
      dims.yBase - dims.panelH - dims.panelW
    )
  );
  creaseSegments.push(
    buildLinePath(
      dims.xBase,
      dims.yBase - dims.panelH - dims.panelW - dims.O,
      dims.xBase + dims.panelL,
      dims.yBase - dims.panelH - dims.panelW - dims.O
    )
  );

  return {
    cutD: cutSegments.join(" "),
    creaseD: creaseSegments.join(" "),
  };
};

interface DimensionProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset: number;
  label: string;
}

const DimensionHorizontal = ({
  x1,
  y1,
  x2,
  y2,
  offset,
  label,
}: DimensionProps) => {
  const y = Math.min(y1, y2) - offset;
  return (
    <g className="dim">
      <line x1={x1} y1={y1} x2={x1} y2={y} className="ext" />
      <line x1={x2} y1={y2} x2={x2} y2={y} className="ext" />
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        markerStart="url(#arrow)"
        markerEnd="url(#arrow)"
        className="dim"
      />
      <text x={(x1 + x2) / 2} y={y - 2} textAnchor="middle" className="txt">
        {label}
      </text>
    </g>
  );
};

const DimensionVertical = ({
  x1,
  y1,
  x2,
  y2,
  offset,
  label,
}: DimensionProps) => {
  const x = Math.max(x1, x2) + offset;
  return (
    <g className="dim">
      <line x1={x1} y1={y1} x2={x} y2={y1} className="ext" />
      <line x1={x2} y1={y2} x2={x} y2={y2} className="ext" />
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        markerStart="url(#arrow)"
        markerEnd="url(#arrow)"
        className="dim"
      />
      <text
        x={x + 2}
        y={(y1 + y2) / 2}
        textAnchor="start"
        dominantBaseline="middle"
        className="txt"
      >
        {label}
      </text>
    </g>
  );
};

type ViewerBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type ViewerBoundsRaw = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export function TechnicalDrawing({ dims, onDxfBounds }: TechnicalDrawingProps) {
  const { mode, dxfText, fileName } = useDxfContext();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<DxfViewer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerBounds, setViewerBounds] = useState<ViewerBounds | null>(null);
  const [viewerBoundsRaw, setViewerBoundsRaw] = useState<ViewerBoundsRaw | null>(null);
  const [viewerUnitScale, setViewerUnitScale] = useState(1);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const presetPaths = useMemo(() => buildDielinePaths(dims), [dims]);

  const viewW = 1000;
  const viewH = 750;
  const margin = 40;
  const sourceW = mode === "upload"
    ? viewerBounds?.width ?? dims.totalWidth
    : dims.totalWidth;
  const sourceH = mode === "upload"
    ? viewerBounds?.height ?? dims.totalHeight
    : dims.totalHeight;
  const fitScale = Math.min(
    (viewW - 2 * margin) / Math.max(sourceW, 1),
    (viewH - 2 * margin) / Math.max(sourceH, 1)
  );
  const contentW = sourceW * fitScale;
  const contentH = sourceH * fitScale;
  const contentX = (viewW - contentW) / 2;
  const contentY = (viewH - contentH) / 2;
  const previewAspect =
    mode === "upload" && viewerBounds
      ? Math.max(viewerBounds.width / Math.max(viewerBounds.height, 1), 0.1)
      : 4 / 3;

  const fontSize = clamp(viewW / 70, 7, 11);
  const labelSize = clamp(viewW / 85, 6, 9);

  useEffect(() => {
    if (mode !== "upload") {
      if (viewerRef.current) {
        viewerRef.current.Destroy();
        viewerRef.current = null;
      }
      return;
    }
    if (!viewerContainerRef.current || viewerRef.current) return;
    viewerRef.current = new DxfViewer(viewerContainerRef.current, {
      autoResize: true,
      clearColor: new THREE.Color("#ffffff"),
      canvasAlpha: true,
      preserveDrawingBuffer: true,
      blackWhiteInversion: true,
      retainParsedDxf: true,
      sceneOptions: {
        arcTessellationAngle: 2.5,
        minArcTessellationSubdivisions: 32,
      },
    });
    setViewerReady(true);
    return () => {
      viewerRef.current?.Destroy();
      viewerRef.current = null;
      setViewerReady(false);
    };
  }, [mode]);

  useEffect(() => {
    if (!viewerReady) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (mode !== "upload" || !dxfText) {
      viewer.Clear();
      setViewerBounds(null);
      setViewerError(null);
      onDxfBounds?.(null);
      return;
    }

    const blob = new Blob([dxfText], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    let canceled = false;
    const canvas = viewer.GetCanvas();
    canvas.style.transformOrigin = "center center";
    canvas.style.transform = "scale(1, 1)";

    viewer
      .Load({ url })
      .then(() => {
        if (canceled) return;
        const bounds = viewer.GetBounds();
        if (!bounds) {
          setViewerBounds(null);
          setViewerBoundsRaw(null);
          setViewerUnitScale(1);
          onDxfBounds?.(null);
          return;
        }
        const parsedDxf = (viewer as any)?.parsedDxf;
        const unitScale = getUnitScale(parsedDxf?.header?.$INSUNITS);
        setViewerUnitScale(unitScale);
        const raw: ViewerBoundsRaw = {
          minX: bounds.minX,
          minY: bounds.minY,
          maxX: bounds.maxX,
          maxY: bounds.maxY,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
        };
        setViewerBoundsRaw(raw);
        const enriched: ViewerBounds = {
          minX: bounds.minX * unitScale,
          minY: bounds.minY * unitScale,
          maxX: bounds.maxX * unitScale,
          maxY: bounds.maxY * unitScale,
          width: (bounds.maxX - bounds.minX) * unitScale,
          height: (bounds.maxY - bounds.minY) * unitScale,
        };
        setViewerBounds(enriched);
        setViewerError(null);
        onDxfBounds?.({ width: enriched.width, height: enriched.height });
      })
      .catch((error) => {
        if (canceled) return;
        console.error(error);
        setViewerBounds(null);
        setViewerBoundsRaw(null);
        setViewerUnitScale(1);
        setViewerError("DXF konnte nicht geladen werden.");
        onDxfBounds?.(null);
      })
      .finally(() => {
        URL.revokeObjectURL(url);
      });

    return () => {
      canceled = true;
      URL.revokeObjectURL(url);
    };
  }, [dxfText, mode, onDxfBounds]);

  useEffect(() => {
    if (!viewerReady) return;
    if (mode !== "upload") return;
    const viewer = viewerRef.current;
    const scene = viewer?.GetScene();
    if (!viewer || !scene || !viewerBoundsRaw) return;
    const boundsW = viewerBoundsRaw.width * viewerUnitScale;
    const boundsH = viewerBoundsRaw.height * viewerUnitScale;
    const scaleX = dims.L / Math.max(boundsW, 1);
    const scaleY = dims.W / Math.max(boundsH, 1);
    scene.scale.set(scaleX, scaleY, 1);
    viewer.Render();
  }, [dims.L, dims.W, mode, viewerBoundsRaw, viewerReady, viewerUnitScale]);

  const handleDownload = () => {
    if (mode === "upload") {
      const canvas = viewerRef.current?.GetCanvas();
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const baseName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "dxf-preview";
      link.href = url;
      link.download = `${baseName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
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
        <div className="flex items-center gap-2">
          {mode === "upload" && dxfText && (
            <button
              onClick={() => {
                const blob = new Blob([dxfText], { type: "application/dxf" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                const baseName = fileName
                  ? fileName.replace(/\.[^/.]+$/, "")
                  : "drawing";
                link.href = url;
                link.download = `${baseName}.dxf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
              type="button"
            >
              DXF download
            </button>
          )}
          <button
            onClick={handleDownload}
            className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
            type="button"
          >
            {mode === "upload" ? "PNG download" : "SVG download"}
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="w-full" style={{ aspectRatio: String(previewAspect) }}>
          {mode === "upload" ? (
            <div className="relative h-full w-full">
              <div ref={viewerContainerRef} className="h-full w-full" />
              {viewerError && (
                <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-widest text-zinc-500">
                  {viewerError}
                </div>
              )}
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${viewW} ${viewH}`}
              className="h-full w-full"
              role="img"
              aria-label="Technische Zeichnung der Box"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                </marker>
                <clipPath id="dxf-frame">
                  <rect x={0} y={0} width={contentW} height={contentH} />
                </clipPath>
                <style>{`
                  .frame { fill: #ffffff; stroke: #1f1f1f; stroke-width: 0.6; vector-effect: non-scaling-stroke; }
                  .cut { fill: none; stroke: #1f1f1f; stroke-width: 0.7; vector-effect: non-scaling-stroke; }
                  .crease { fill: none; stroke: #1f1f1f; stroke-width: 0.5; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
                  .perf { fill: none; stroke: #1f1f1f; stroke-width: 0.4; stroke-dasharray: 1 3; vector-effect: non-scaling-stroke; }
                  .dim { fill: none; stroke: #1f1f1f; stroke-width: 0.4; vector-effect: non-scaling-stroke; }
                  .ext { stroke: #1f1f1f; stroke-width: 0.35; vector-effect: non-scaling-stroke; }
                  .txt { font-family: var(--font-body, Arial); font-size: ${fontSize}px; fill: #1f1f1f; }
                  .label { font-family: var(--font-body, Arial); font-size: ${labelSize}px; fill: #1f1f1f; }
                `}</style>
              </defs>

              <g transform={`translate(${contentX}, ${contentY})`}>
                <rect x={0} y={0} width={contentW} height={contentH} className="frame" />
                <g clipPath="url(#dxf-frame)">
                  <g transform={`scale(${fitScale} ${fitScale})`}>
                    <path d={presetPaths.cutD} className="cut" />
                    <path d={presetPaths.creaseD} className="crease" />
                  </g>
                </g>
              </g>

              <DimensionHorizontal
                x1={contentX}
                y1={contentY + contentH}
                x2={contentX + contentW}
                y2={contentY + contentH}
                offset={12}
                label={`${formatNumber(sourceW)} mm`}
              />
              <DimensionVertical
                x1={contentX + contentW}
                y1={contentY}
                x2={contentX + contentW}
                y2={contentY + contentH}
                offset={12}
                label={`${formatNumber(sourceH)} mm`}
              />
            </svg>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Konstruktionsdaten
          </p>
          <p className="mt-2 font-semibold text-zinc-900">
            Bogen: {formatNumber(sourceW)} x {formatNumber(sourceH)} mm
          </p>
          <p className="text-zinc-600">
            Eingabe: {formatNumber(dims.L)} x {formatNumber(dims.W)} x {formatNumber(dims.H)} mm
          </p>
          <p className="text-zinc-600">Materialstaerke: {formatNumber(dims.T)} mm</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Hinweis</p>
          <p className="mt-2 text-zinc-600">
            {mode === "upload"
              ? "Die Vorschau zeigt das hochgeladene DXF direkt aus dxf-viewer."
              : "Preset zeigt die interne Magnetbox-Schablone."}
          </p>
        </div>
      </div>
    </div>
  );
}
