# AGENTS.md

This document describes the current state of the Makerthon prototype, the DXF upload/rendering pipeline, and the major UI/logic components.

## Project Overview
This Next.js (App Router) + React + TypeScript project is a packaging template generator prototype. It provides:
- A preset box template with inputs (L/W/H, material thickness, lid overlap, glue tab).
- DXF upload to render technical drawings directly in the browser.
- A 3D preview driven by current inputs (and DXF bounds when uploaded).
- An SVG export of the technical drawing.

## Core User Flow
1) Choose template source (Preset or DXF Upload).
2) Enter box parameters (Length L, Width W, Height H, thickness, lid overlap, glue tab).
3) Preview:
   - Technical drawing (SVG) updates in real time.
   - 3D box preview updates in real time.
4) Download SVG of the technical drawing.

## DXF Pipeline (Client-Side)
DXF handling is fully client-side and uses `dxf-parser`.

### Parsing + Normalization
File: `components/dxf.ts`
- **Units**: The parser reads `header.$INSUNITS` and scales to mm when possible.
- **Layer/linetype classification**: Cut/crease/perf inferred from layer or linetype names.
- **Supported entities**:
  - LINE (including `vertices` fallback)
  - ARC
  - CIRCLE
  - LWPOLYLINE / POLYLINE (including bulge arcs)
  - SOLID
  - ELLIPSE
  - SPLINE
- **Bulge handling**: Bulged polyline segments are approximated into arc points so side arcs appear correctly.
- **Blocks**: INSERT is parsed with minimal explode (basic LINE/CIRCLE). If a DXF uses complex blocks, additional explode support may be required.

### Output
`processDxf(text)` returns:
- `cutD`, `creaseD`, `perfD` SVG path strings
- `bounds` (minX, minY, maxX, maxY, width, height)
- `creaseX` (vertical crease lines used for chain dimensions)

## UI Components

### 1) `app/page.tsx`
Main page; wires all state and provides DXF upload flow.
- Holds inputs (L/W/H etc).
- Reads DXF upload and auto-fills inputs from DXF bounds (length = width, width = height).
- Provides `DxfProvider` context to child components.

### 2) `components/DxfContext.tsx`
Context providing:
- mode: `preset` or `upload`
- dxfText (raw DXF file text)
- fileName
- setters for mode/file state

### 3) `components/BoxInputs.tsx`
Left panel input UI.
- Template source selector (Preset / DXF Upload)
- DXF file input
- Inputs for L/W/H, thickness, lid overlap, glue tab

### 4) `components/TechnicalDrawing.tsx`
SVG technical drawing preview.
- Fixed preview frame (1000x750 viewBox)
- DXF rendering uses `processDxf` for path generation
- Preset fallback when no DXF is uploaded
- Non-uniform scaling (X from L, Y from H) in DXF mode
- Dimensions in mm

### 5) `components/ThreePreview.tsx`
3D preview using Three.js.
- Orbit controls for manual rotation
- Uses DXF bounds for X/Z and H for Y in upload mode
- Uses preset dims in preset mode

### 6) Utilities
- `components/dimensions.ts`: Computes preset box layout from input parameters.
- `components/formatters.ts`: Localized number formatting.
- `components/types.ts`: Shared type definitions.

## Preview Scaling Logic

### Technical Drawing
- Preview is fixed to a frame (viewBox 1000x750).
- DXF geometry is scaled in X and Y based on L/H and fit-to-frame scale.
- Dimensions in the UI reflect **real mm values**, not viewport pixels.

### 3D Preview
- DXF upload mode:
  - X = DXF width (mm)
  - Y = H (user input)
  - Z = DXF height (mm)
- Preset mode:
  - X = panelL
  - Y = panelH
  - Z = panelW

## Known Limitations
- DXF block exploding is minimal (LINE/CIRCLE). Complex block entities may not render.
- No DXF export yet (only SVG download of the current preview).
- Input-to-DXF mapping is currently general (bbox scaling), not semantic panel mapping.

## Demo Data
Location: `demo_data/`
- `pppps1264hc.box.klein.mantel.dxf` — Sample DXF
- `technische_zeichnung.pdf` — Reference PDF
- `Mantel.xlsx` — Format reference data

## How to Extend
- Add a DXF export pipeline if you want cleaned/transformed DXF output.
- Add a format selector driven by `Mantel.xlsx` for precise presets.
- Add layer mapping UI to control cut/crease/perf on import.

