// Each learning path gets its own color identity (like course colors on Khan Academy/Duolingo)
// so the app reads as a colorful subject catalog instead of one flat brand-blue everywhere.
const PALETTE = [
  { solid: "#2f80c9", soft: "#dbedfb" }, // blue
  { solid: "#7c5cd6", soft: "#ece6fa" }, // violet
  { solid: "#14a37f", soft: "#d7f3ea" }, // teal
  { solid: "#e0568c", soft: "#fbe0ea" }, // rose
  { solid: "#d97a1f", soft: "#fbe8d2" }, // amber
];

function hashIndex(id: string, length: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % length;
}

export function pathColor(pathId: string) {
  return PALETTE[hashIndex(pathId, PALETTE.length)];
}
