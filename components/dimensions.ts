export const buildDimensions = ({
  length,
  width,
  height,
  thickness,
  lidOverlap,
  glueTab,
}: {
  length: number;
  width: number;
  height: number;
  thickness: number;
  lidOverlap: number;
  glueTab: number;
}) => {
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
};
