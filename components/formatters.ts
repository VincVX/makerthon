export const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
};
