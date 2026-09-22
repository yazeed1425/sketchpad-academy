// Each learning path gets its own color identity (like course colors on Khan Academy/Duolingo)
// so the app reads as a colorful subject catalog instead of one flat brand-blue everywhere.
const PALETTE = [
  { solid: "#155eef", soft: "#eff4ff" }, // blue (Discover primary)
  { solid: "#7a5af8", soft: "#f4f3ff" }, // purple
  { solid: "#17b26a", soft: "#edfcf2" }, // green
  { solid: "#d444f1", soft: "#fdf4ff" }, // fuchsia
  { solid: "#f79009", soft: "#fef6e7" }, // amber
];

function hashIndex(id: string, length: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % length;
}

export function pathColor(pathId: string) {
  return PALETTE[hashIndex(pathId, PALETTE.length)];
}
