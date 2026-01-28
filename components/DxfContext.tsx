"use client";

import { createContext, useContext } from "react";

export type DxfMode = "preset" | "upload";

interface DxfContextValue {
  mode: DxfMode;
  dxfText: string | null;
  setMode: (mode: DxfMode) => void;
  setDxfText: (text: string | null) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
}

const DxfContext = createContext<DxfContextValue | null>(null);

export const useDxfContext = () => {
  const ctx = useContext(DxfContext);
  if (!ctx) throw new Error("useDxfContext must be used within DxfProvider");
  return ctx;
};

export function DxfProvider({
  value,
  children,
}: {
  value: DxfContextValue;
  children: React.ReactNode;
}) {
  return <DxfContext.Provider value={value}>{children}</DxfContext.Provider>;
}
