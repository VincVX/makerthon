import DxfParser from "dxf-parser";

export type DxfEntity =
  | {
      type: "LINE";
      layer: string;
      lineType?: string;
      color?: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | {
      type: "ARC";
      layer: string;
      lineType?: string;
      color?: number;
      cx: number;
      cy: number;
      r: number;
      start: number;
      end: number;
    }
  | {
      type: "CIRCLE";
      layer: string;
      lineType?: string;
      color?: number;
      cx: number;
      cy: number;
      r: number;
    }
  | {
      type: "POLYLINE";
      layer: string;
      lineType?: string;
      color?: number;
      points: { x: number; y: number }[];
      closed: boolean;
    }
  | {
      type: "SOLID";
      layer: string;
      lineType?: string;
      color?: number;
      points: { x: number; y: number }[];
    }
  | {
      type: "ELLIPSE";
      layer: string;
      lineType?: string;
      color?: number;
      points: { x: number; y: number }[];
    }
  | {
      type: "SPLINE";
      layer: string;
      lineType?: string;
      color?: number;
      points: { x: number; y: number }[];
    };

export interface DxfBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface DxfPaths {
  cutD: string;
  creaseD: string;
  perfD: string;
  bounds: DxfBounds;
  creaseX: number[];
}

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


const normalizeLayer = (layer?: string) => (layer || "").toLowerCase();

const isCreaseLayer = (layer?: string, lineType?: string) => {
  const name = normalizeLayer(layer);
  const lt = normalizeLayer(lineType);
  return (
    name.includes("rill") ||
    name.includes("score") ||
    name.includes("fold") ||
    name.includes("crease") ||
    name === "10" ||
    lt.includes("dash") ||
    lt.includes("center")
  );
};

const isPerfLayer = (layer?: string, lineType?: string) => {
  const name = normalizeLayer(layer);
  const lt = normalizeLayer(lineType);
  return (
    name.includes("perf") ||
    name.includes("perfo") ||
    name.includes("micro") ||
    name.includes("dash") ||
    lt.includes("dot")
  );
};

const buildPolylinePath = (points: { x: number; y: number }[], closed: boolean) => {
  if (!points.length) return "";
  const [first, ...rest] = points;
  const d = [`M ${first.x} ${first.y}`];
  rest.forEach((pt) => d.push(`L ${pt.x} ${pt.y}`));
  if (closed) d.push("Z");
  return d.join(" ");
};

const buildCirclePath = (cx: number, cy: number, r: number) =>
  `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;

const degToRad = (deg: number) => (deg * Math.PI) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

const getArcAngleUnit = (entities: any[]) => {
  let maxAbs = 0;
  entities.forEach((entity) => {
    if (entity?.type !== "ARC") return;
    const start = entity.startAngle ?? 0;
    const end = entity.endAngle ?? 0;
    maxAbs = Math.max(maxAbs, Math.abs(start), Math.abs(end));
  });
  if (maxAbs === 0) return "deg";
  return maxAbs <= Math.PI * 2 + 1e-4 ? "rad" : "deg";
};

const buildEllipsePoints = (
  cx: number,
  cy: number,
  majorX: number,
  majorY: number,
  ratio: number,
  start: number,
  end: number,
  segments = 64
) => {
  const majorLen = Math.hypot(majorX, majorY);
  const minorLen = majorLen * ratio;
  const angle = Math.atan2(majorY, majorX);
  const span = end - start;
  const pts: { x: number; y: number }[] = [];
  const steps = Math.max(8, Math.round((segments * Math.abs(span)) / (2 * Math.PI)));
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (span * i) / steps;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const x = cx + majorLen * cosT * Math.cos(angle) - minorLen * sinT * Math.sin(angle);
    const y = cy + majorLen * cosT * Math.sin(angle) + minorLen * sinT * Math.cos(angle);
    pts.push({ x, y });
  }
  return pts;
};

const bulgeToArcPoints = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bulge: number,
  segments = 12
) => {
  if (bulge === 0) return [p1, p2];
  const theta = 4 * Math.atan(bulge);
  const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (chord === 0) return [p1];
  const radius = chord / (2 * Math.sin(theta / 2));
  const radiusAbs = Math.abs(radius);
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const dir = { x: (p2.x - p1.x) / chord, y: (p2.y - p1.y) / chord };
  const perp = { x: -dir.y, y: dir.x };
  const offset = Math.cos(theta / 2) * radiusAbs;
  const center = {
    x: mid.x + perp.x * offset * Math.sign(bulge),
    y: mid.y + perp.y * offset * Math.sign(bulge),
  };
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = startAngle + theta;
  const steps = Math.max(3, Math.round((Math.abs(theta) / (Math.PI * 2)) * segments));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = startAngle + (theta * i) / steps;
    pts.push({
      x: center.x + radiusAbs * Math.cos(t),
      y: center.y + radiusAbs * Math.sin(t),
    });
  }
  return pts;
};

const applyTransform = (
  pt: { x: number; y: number },
  insertion: { x: number; y: number },
  scale: { x: number; y: number },
  rotation: number
) => {
  const rad = degToRad(rotation);
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const sx = pt.x * scale.x;
  const sy = pt.y * scale.y;
  return {
    x: insertion.x + sx * cosR - sy * sinR,
    y: insertion.y + sx * sinR + sy * cosR,
  };
};

const buildArcPoints = (
  center: { x: number; y: number },
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = 24
) => {
  let span = endAngle - startAngle;
  if (span <= 0) span += 360;
  const steps = Math.max(6, Math.round((Math.abs(span) / 360) * segments));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const deg = startAngle + (span * i) / steps;
    const rad = degToRad(deg);
    pts.push({
      x: center.x + radius * Math.cos(rad),
      y: center.y + radius * Math.sin(rad),
    });
  }
  return pts;
};

const explodeInsert = (
  entity: any,
  blocks: any,
  unitScale: number,
  arcAngleUnit: "deg" | "rad"
): DxfEntity[] => {
  const name = entity.name || entity.block || entity.blockName;
  const block = blocks?.[name];
  if (!block?.entities) return [];
  const insertion = entity.position || entity.insertionPoint || { x: 0, y: 0 };
  const scale = {
    x: entity.xscale ?? entity.scale?.x ?? 1,
    y: entity.yscale ?? entity.scale?.y ?? 1,
  };
  const rotation = entity.rotation ?? 0;
  const entities: DxfEntity[] = [];

  block.entities.forEach((child: any) => {
    const layer = entity.layer || child.layer || "1";
    const lineType = child.lineType || child.lineTypeName;
    const color = child.color || child.colorIndex;

    if (child.type === "LINE") {
      const start = child.start || child.vertices?.[0];
      const end = child.end || child.vertices?.[1];
      if (!start || !end) return;
      const s = applyTransform(start, insertion, scale, rotation);
      const e = applyTransform(end, insertion, scale, rotation);
      entities.push({
        type: "LINE",
        layer,
        lineType,
        color,
        x1: s.x * unitScale,
        y1: s.y * unitScale,
        x2: e.x * unitScale,
        y2: e.y * unitScale,
      });
    }

    if (child.type === "CIRCLE") {
      if (!child.center || !child.radius) return;
      if (scale.x !== scale.y) {
        const rawPts = buildEllipsePoints(
          child.center.x,
          child.center.y,
          child.radius,
          0,
          1,
          0,
          Math.PI * 2
        );
        const transformed = rawPts.map((pt) =>
          applyTransform(pt, insertion, scale, rotation)
        );
        entities.push({
          type: "ELLIPSE",
          layer,
          lineType,
          color,
          points: transformed.map((pt) => ({
            x: pt.x * unitScale,
            y: pt.y * unitScale,
          })),
        });
        return;
      }
      const center = applyTransform(child.center, insertion, scale, rotation);
      entities.push({
        type: "CIRCLE",
        layer,
        lineType,
        color,
        cx: center.x * unitScale,
        cy: center.y * unitScale,
        r: child.radius * scale.x * unitScale,
      });
    }

    if (child.type === "ARC") {
      if (!child.center || !child.radius) return;
      const start = arcAngleUnit === "rad" ? radToDeg(child.startAngle ?? 0) : child.startAngle ?? 0;
      const end = arcAngleUnit === "rad" ? radToDeg(child.endAngle ?? 0) : child.endAngle ?? 0;
      const arcPts = buildArcPoints(
        child.center,
        child.radius,
        start,
        end,
        32
      ).map((pt) => applyTransform(pt, insertion, scale, rotation));
      entities.push({
        type: "POLYLINE",
        layer,
        lineType,
        color,
        points: arcPts.map((pt) => ({
          x: pt.x * unitScale,
          y: pt.y * unitScale,
        })),
        closed: false,
      });
    }

    if (child.type === "LWPOLYLINE" || child.type === "POLYLINE") {
      const raw = child.vertices || child.points || [];
      const vertices = raw.map((pt: any) => ({
        x: pt.x,
        y: pt.y,
        bulge: pt.bulge || 0,
      }));
      if (!vertices.length) return;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < vertices.length - 1; i += 1) {
        const p1 = vertices[i];
        const p2 = vertices[i + 1];
        const arcPts = bulgeToArcPoints(p1, p2, p1.bulge || 0, 16);
        if (i > 0) arcPts.shift();
        points.push(...arcPts);
      }
      if (child.closed) {
        const p1 = vertices[vertices.length - 1];
        const p2 = vertices[0];
        const arcPts = bulgeToArcPoints(p1, p2, p1.bulge || 0, 16);
        arcPts.shift();
        points.push(...arcPts);
      } else {
        const last = vertices[vertices.length - 1];
        points.push({ x: last.x, y: last.y });
      }
      const transformed = points.map((pt) =>
        applyTransform(pt, insertion, scale, rotation)
      );
      entities.push({
        type: "POLYLINE",
        layer,
        lineType,
        color,
        points: transformed.map((pt) => ({
          x: pt.x * unitScale,
          y: pt.y * unitScale,
        })),
        closed: Boolean(child.closed),
      });
    }

    if (child.type === "ELLIPSE") {
      const center = child.center;
      const major = child.majorAxisEnd || child.majorAxis;
      if (!center || !major) return;
      const rawPts = buildEllipsePoints(
        center.x,
        center.y,
        major.x,
        major.y,
        child.axisRatio ?? 1,
        child.startAngle ?? 0,
        child.endAngle ?? Math.PI * 2
      );
      const transformed = rawPts.map((pt) =>
        applyTransform(pt, insertion, scale, rotation)
      );
      entities.push({
        type: "ELLIPSE",
        layer,
        lineType,
        color,
        points: transformed.map((pt) => ({
          x: pt.x * unitScale,
          y: pt.y * unitScale,
        })),
      });
    }

    if (child.type === "SPLINE") {
      const raw = child.fitPoints || child.controlPoints || [];
      if (!raw.length) return;
      const transformed = raw.map((pt: any) =>
        applyTransform(pt, insertion, scale, rotation)
      );
      entities.push({
        type: "SPLINE",
        layer,
        lineType,
        color,
        points: transformed.map((pt) => ({
          x: pt.x * unitScale,
          y: pt.y * unitScale,
        })),
      });
    }
  });

  return entities;
};

export const parseDxfToEntities = (text: string): DxfEntity[] => {
  const parser = new DxfParser();
  const data = parser.parseSync(text);
  const unitScale = getUnitScale(data.header?.$INSUNITS);
  const arcAngleUnit = getArcAngleUnit(data.entities || []);
  const entities: DxfEntity[] = [];

  data.entities?.forEach((entity: any) => {
    const layer = entity.layer || "1";
    const lineType = entity.lineType || entity.lineTypeName;
    const color = entity.color || entity.colorIndex;

    if (entity.type === "INSERT") {
      entities.push(...explodeInsert(entity, data.blocks, unitScale, arcAngleUnit));
      return;
    }

    if (entity.type === "LINE") {
      const start = entity.start || entity.vertices?.[0];
      const end = entity.end || entity.vertices?.[1];
      if (!start || !end) return;
      entities.push({
        type: "LINE",
        layer,
        lineType,
        color,
        x1: start.x * unitScale,
        y1: start.y * unitScale,
        x2: end.x * unitScale,
        y2: end.y * unitScale,
      });
    }

    if (entity.type === "CIRCLE") {
      if (!entity.center || !entity.radius) return;
      entities.push({
        type: "CIRCLE",
        layer,
        lineType,
        color,
        cx: entity.center.x * unitScale,
        cy: entity.center.y * unitScale,
        r: entity.radius * unitScale,
      });
    }

    if (entity.type === "ARC") {
      if (!entity.center || !entity.radius) return;
      const start =
        arcAngleUnit === "rad"
          ? radToDeg(entity.startAngle ?? 0)
          : entity.startAngle ?? 0;
      const end =
        arcAngleUnit === "rad"
          ? radToDeg(entity.endAngle ?? 0)
          : entity.endAngle ?? 0;
      entities.push({
        type: "ARC",
        layer,
        lineType,
        color,
        cx: entity.center.x * unitScale,
        cy: entity.center.y * unitScale,
        r: entity.radius * unitScale,
        start,
        end,
      });
    }

    if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
      const raw = entity.vertices || entity.points || [];
      const vertices = raw.map((pt: any) => ({
        x: pt.x * unitScale,
        y: pt.y * unitScale,
        bulge: pt.bulge || 0,
      }));
      if (!vertices.length) return;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < vertices.length - 1; i += 1) {
        const p1 = vertices[i];
        const p2 = vertices[i + 1];
        const arcPts = bulgeToArcPoints(p1, p2, p1.bulge || 0, 16);
        if (i > 0) arcPts.shift();
        points.push(...arcPts);
      }
      if (entity.closed) {
        const p1 = vertices[vertices.length - 1];
        const p2 = vertices[0];
        const arcPts = bulgeToArcPoints(p1, p2, p1.bulge || 0, 16);
        arcPts.shift();
        points.push(...arcPts);
      } else {
        const last = vertices[vertices.length - 1];
        points.push({ x: last.x, y: last.y });
      }
      entities.push({
        type: "POLYLINE",
        layer,
        lineType,
        color,
        points,
        closed: Boolean(entity.closed),
      });
    }

    if (entity.type === "SOLID") {
      const points = (entity.points || []).map((pt: any) => ({
        x: pt.x * unitScale,
        y: pt.y * unitScale,
      }));
      if (!points.length) return;
      entities.push({
        type: "SOLID",
        layer,
        lineType,
        color,
        points,
      });
    }

    if (entity.type === "ELLIPSE") {
      const center = entity.center;
      const major = entity.majorAxisEnd || entity.majorAxis;
      if (!center || !major) return;
      entities.push({
        type: "ELLIPSE",
        layer,
        lineType,
        color,
        points: buildEllipsePoints(
          center.x * unitScale,
          center.y * unitScale,
          major.x * unitScale,
          major.y * unitScale,
          entity.axisRatio ?? 1,
          entity.startAngle ?? 0,
          entity.endAngle ?? Math.PI * 2
        ),
      });
    }

    if (entity.type === "SPLINE") {
      const points = (entity.fitPoints || entity.controlPoints || []).map((pt: any) => ({
        x: pt.x * unitScale,
        y: pt.y * unitScale,
      }));
      if (!points.length) return;
      entities.push({
        type: "SPLINE",
        layer,
        lineType,
        color,
        points,
      });
    }
  });

  return entities;
};

export const getBounds = (entities: DxfEntity[]): DxfBounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const expand = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  entities.forEach((entity) => {
    if (entity.type === "LINE") {
      expand(entity.x1, entity.y1);
      expand(entity.x2, entity.y2);
    }
    if (entity.type === "CIRCLE") {
      expand(entity.cx - entity.r, entity.cy - entity.r);
      expand(entity.cx + entity.r, entity.cy + entity.r);
    }
    if (entity.type === "ARC") {
      expand(entity.cx - entity.r, entity.cy - entity.r);
      expand(entity.cx + entity.r, entity.cy + entity.r);
    }
    if ("points" in entity) {
      entity.points.forEach((pt) => expand(pt.x, pt.y));
    }
  });

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const buildPathsFromEntities = (entities: DxfEntity[]): DxfPaths => {
  const bounds = getBounds(entities);
  const normalizeX = (x: number) => x - bounds.minX;
  const normalizeY = (y: number) => bounds.maxY - y;

  const cutSegments: string[] = [];
  const creaseSegments: string[] = [];
  const perfSegments: string[] = [];
  const creaseX: number[] = [];

  entities.forEach((entity) => {
    const crease = isCreaseLayer(entity.layer, entity.lineType);
    const perf = isPerfLayer(entity.layer, entity.lineType);

    if (entity.type === "LINE") {
      const x1 = normalizeX(entity.x1);
      const y1 = normalizeY(entity.y1);
      const x2 = normalizeX(entity.x2);
      const y2 = normalizeY(entity.y2);
      const path = `M ${x1} ${y1} L ${x2} ${y2}`;
      if (perf) {
        perfSegments.push(path);
      } else if (crease) {
        creaseSegments.push(path);
        if (Math.abs(x1 - x2) < 0.2) creaseX.push(x1);
      } else {
        cutSegments.push(path);
      }
    }

    if (entity.type === "ARC") {
      const startRad = degToRad(entity.start);
      const endRad = degToRad(entity.end);
      const sx = normalizeX(entity.cx + entity.r * Math.cos(startRad));
      const sy = normalizeY(entity.cy + entity.r * Math.sin(startRad));
      const ex = normalizeX(entity.cx + entity.r * Math.cos(endRad));
      const ey = normalizeY(entity.cy + entity.r * Math.sin(endRad));
      const largeArc = ((entity.end - entity.start + 360) % 360) > 180 ? 1 : 0;
      const sweep = 1;
      const arcPath = `M ${sx} ${sy} A ${entity.r} ${entity.r} 0 ${largeArc} ${sweep} ${ex} ${ey}`;
      if (perf) perfSegments.push(arcPath);
      else if (crease) creaseSegments.push(arcPath);
      else cutSegments.push(arcPath);
    }

    if (entity.type === "CIRCLE") {
      const cx = normalizeX(entity.cx);
      const cy = normalizeY(entity.cy);
      const circlePath = buildCirclePath(cx, cy, entity.r);
      if (perf) perfSegments.push(circlePath);
      else if (crease) creaseSegments.push(circlePath);
      else cutSegments.push(circlePath);
    }

    if ("points" in entity) {
      const points = entity.points.map((pt) => ({
        x: normalizeX(pt.x),
        y: normalizeY(pt.y),
      }));
      const closed =
        entity.type === "POLYLINE"
          ? entity.closed
          : entity.type === "SOLID";
      const polyPath = buildPolylinePath(points, closed);
      if (!polyPath) return;
      if (perf) perfSegments.push(polyPath);
      else if (crease) creaseSegments.push(polyPath);
      else cutSegments.push(polyPath);
    }
  });

  const uniqueSorted = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const unique: number[] = [];
    sorted.forEach((value) => {
      if (!unique.length || Math.abs(value - unique[unique.length - 1]) > 0.6) {
        unique.push(value);
      }
    });
    return unique;
  };

  return {
    cutD: cutSegments.join(" "),
    creaseD: creaseSegments.join(" "),
    perfD: perfSegments.join(" "),
    bounds,
    creaseX: uniqueSorted(creaseX),
  };
};

export const processDxf = (text: string) => {
  const parsed = parseDxfToEntities(text);
  return buildPathsFromEntities(parsed);
};
