export interface BoxDimensions {
  L: number;
  W: number;
  H: number;
  T: number;
  O: number;
  G: number;
  panelL: number;
  panelW: number;
  panelH: number;
  totalWidth: number;
  totalHeight: number;
  xBase: number;
  yBase: number;
}

export interface BoxInputsProps {
  length: number;
  width: number;
  height: number;
  thickness: number;
  lidOverlap: number;
  glueTab: number;
  dims: BoxDimensions;
  mode: "preset" | "upload";
  fileName: string | null;
  onLengthChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onThicknessChange: (value: number) => void;
  onLidOverlapChange: (value: number) => void;
  onGlueTabChange: (value: number) => void;
  onModeChange: (mode: "preset" | "upload") => void;
  onFileUpload: (file: File | null) => void;
  onClearUpload: () => void;
}
