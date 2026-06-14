export const COLORS = {
  expandable: "#0000EE",
  leaf: "#7aaee8",
  leafBorder: "#7aaee8",
  current: "#6f1078",
  visitedBorder: "#E23CE3",
  unvisitedBorder: "#C8DCF0",
  edgeVisited: "#E23CE3",
  edgeUnvisited: "#C8DCF0",
};

export const GRAPH_BG = [240, 244, 255] as const;

export const fadedColor = (hex: string, alpha = 0.03): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number, i: number) => Math.round(c * alpha + GRAPH_BG[i] * (1 - alpha)).toString(16).padStart(2, "0");
  return `#${mix(r, 0)}${mix(g, 1)}${mix(b, 2)}`;
};

export const disabledColor = (naturalColor: string): string =>
  fadedColor(naturalColor, naturalColor === COLORS.leaf ? 0.09 : 0.03);

export const unvisitedBorder = (hasLinks: boolean) => hasLinks ? COLORS.unvisitedBorder : COLORS.leafBorder;
export const unvisitedBorderSize = (hasLinks: boolean) => hasLinks ? 0.0001 : 0.25;
