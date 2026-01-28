"use client";

import { useMemo } from "react";
import { useDxfContext } from "./DxfContext";
import { processDxf } from "./dxf";
import { formatNumber } from "./formatters";
import type { BoxDimensions } from "./types";

interface TechnicalDrawingProps {
  dims: BoxDimensions;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onDownload: () => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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

const DimensionChainHorizontal = ({
  y,
  xStart,
  segments,
  offset,
}: {
  y: number;
  xStart: number;
  segments: number[];
  offset: number;
}) => {
  let cursor = xStart;
  return (
    <g className="dim">
      {segments.map((segment, index) => {
        const x1 = cursor;
        const x2 = cursor + segment;
        cursor = x2;
        return (
          <g key={`dim-${index}`}>
            <line x1={x1} y1={y} x2={x1} y2={y - offset} className="ext" />
            <line x1={x2} y1={y} x2={x2} y2={y - offset} className="ext" />
            <line
              x1={x1}
              y1={y - offset}
              x2={x2}
              y2={y - offset}
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
              className="dim"
            />
            <text
              x={(x1 + x2) / 2}
              y={y - offset - 2}
              textAnchor="middle"
              className="txt"
            >
              {formatNumber(segment)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export function TechnicalDrawing({ dims, svgRef, onDownload }: TechnicalDrawingProps) {
  const { mode, dxfText } = useDxfContext();

  const dxf = useMemo(() => {
    if (mode !== "upload" || !dxfText) return null;
    try {
      return processDxf(dxfText);
    } catch {
      return null;
    }
  }, [mode, dxfText]);

  const presetPaths = useMemo(() => buildDielinePaths(dims), [dims]);

  const viewW = 1000;
  const viewH = 750;
  const margin = 40;
  const sourceW = dxf?.bounds.width ?? dims.totalWidth;
  const sourceH = dxf?.bounds.height ?? dims.totalHeight;
  const targetW = dims.L;
  const targetH = dims.H;
  const modelScaleX = dxf ? targetW / Math.max(sourceW, 1) : 1;
  const modelScaleY = dxf ? targetH / Math.max(sourceH, 1) : 1;
  const transformedW = sourceW * modelScaleX;
  const transformedH = sourceH * modelScaleY;
  const fitScale = Math.min(
    (viewW - 2 * margin) / Math.max(sourceW, 1),
    (viewH - 2 * margin) / Math.max(sourceH, 1)
  );
  const scaleX = modelScaleX * fitScale;
  const scaleY = modelScaleY * fitScale;
  const contentW = sourceW * fitScale;
  const contentH = sourceH * fitScale;
  const contentX = (viewW - contentW) / 2;
  const contentY = (viewH - contentH) / 2;

  const fontSize = clamp(viewW / 70, 7, 11);
  const labelSize = clamp(viewW / 85, 6, 9);

  const chainSegments = useMemo(() => {
    if (!dxf?.creaseX?.length) return [] as number[];
    const positions = [0, ...dxf.creaseX, sourceW].sort((a, b) => a - b);
    const segments: number[] = [];
    for (let i = 0; i < positions.length - 1; i += 1) {
      const segment = positions[i + 1] - positions[i];
      if (segment > 0.5) segments.push(segment);
    }
    return segments;
  }, [dxf?.creaseX, sourceW]);

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
        <button
          onClick={onDownload}
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
                <g transform={`scale(${scaleX} ${scaleY})`}>
                  {dxf ? (
                    <>
                      <path d={dxf.cutD} className="cut" />
                      <path d={dxf.creaseD} className="crease" />
                      {dxf.perfD && <path d={dxf.perfD} className="perf" />}
                    </>
                  ) : (
                    <>
                      <path d={presetPaths.cutD} className="cut" />
                      <path d={presetPaths.creaseD} className="crease" />
                    </>
                  )}
                </g>
              </g>
            </g>

            <DimensionHorizontal
              x1={contentX}
              y1={contentY + contentH}
              x2={contentX + contentW}
              y2={contentY + contentH}
              offset={12}
              label={`${formatNumber(transformedW)} mm`}
            />
            <DimensionVertical
              x1={contentX + contentW}
              y1={contentY}
              x2={contentX + contentW}
              y2={contentY + contentH}
              offset={12}
              label={`${formatNumber(transformedH)} mm`}
            />
            {chainSegments.length > 1 && (
              <DimensionChainHorizontal
                y={contentY + contentH}
                xStart={contentX}
                segments={chainSegments.map((segment) => segment * scaleX)}
                offset={26}
              />
            )}
          </svg>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Konstruktionsdaten
          </p>
          <p className="mt-2 font-semibold text-zinc-900">
            Bogen: {formatNumber(transformedW)} x {formatNumber(transformedH)} mm
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
              ? "Die Vorschau zeigt das hochgeladene DXF, bereinigt und in mm skaliert."
              : "Preset zeigt die interne Magnetbox-Schablone."}
          </p>
        </div>
      </div>
    </div>
  );
}
