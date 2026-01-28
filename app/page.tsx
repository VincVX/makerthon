"use client";

import { useMemo, useRef, useState } from "react";
import { processDxf } from "@/components/dxf";
import { BoxInputs } from "@/components/BoxInputs";
import { DxfProvider, type DxfMode } from "@/components/DxfContext";
import { FormatHeader } from "@/components/FormatHeader";
import { TechnicalDrawing } from "@/components/TechnicalDrawing";
import { ThreePreview } from "@/components/ThreePreview";
import { buildDimensions } from "@/components/dimensions";

export default function Home() {
  const [length, setLength] = useState(220);
  const [width, setWidth] = useState(140);
  const [height, setHeight] = useState(70);
  const [thickness, setThickness] = useState(2);
  const [lidOverlap, setLidOverlap] = useState(30);
  const [glueTab, setGlueTab] = useState(12);
  const [mode, setMode] = useState<DxfMode>("preset");
  const [dxfText, setDxfText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const dims = useMemo(
    () =>
      buildDimensions({
        length,
        width,
        height,
        thickness,
        lidOverlap,
        glueTab,
      }),
    [length, width, height, thickness, lidOverlap, glueTab]
  );

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

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : null;
      setDxfText(text);
      if (text) {
        try {
          const processed = processDxf(text);
          setLength(Math.round(processed.bounds.width));
          setWidth(Math.round(processed.bounds.height));
        } catch {
          // ignore parse errors
        }
      }
      setFileName(file.name);
      setMode("upload");
    };
    reader.readAsText(file);
  };

  const handleClearUpload = () => {
    setDxfText(null);
    setFileName(null);
    setMode("preset");
  };

  return (
    <DxfProvider
      value={{
        mode,
        dxfText,
        fileName,
        setMode,
        setDxfText,
        setFileName,
      }}
    >
      <div className="relative min-h-screen overflow-hidden bg-[#f7f2e8] text-zinc-900">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(250,195,90,0.35),rgba(250,195,90,0))] blur-2xl" />
        <div className="pointer-events-none absolute left-[-20%] top-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(76,145,248,0.25),rgba(76,145,248,0))] blur-3xl" />

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 font-[var(--font-body)] lg:flex-row lg:items-start lg:gap-12">
          <section className="flex flex-1 flex-col gap-8">
            <FormatHeader />
            <BoxInputs
              length={length}
              width={width}
              height={height}
              thickness={thickness}
              lidOverlap={lidOverlap}
              glueTab={glueTab}
              dims={dims}
              mode={mode}
              fileName={fileName}
              onLengthChange={setLength}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onThicknessChange={setThickness}
              onLidOverlapChange={setLidOverlap}
              onGlueTabChange={setGlueTab}
              onModeChange={setMode}
              onFileUpload={handleFileUpload}
              onClearUpload={handleClearUpload}
            />
          </section>

          <section className="flex w-full flex-1 flex-col gap-6">
            <ThreePreview dims={dims} />
            <TechnicalDrawing dims={dims} svgRef={svgRef} onDownload={handleDownload} />
          </section>
        </main>
      </div>
    </DxfProvider>
  );
}
