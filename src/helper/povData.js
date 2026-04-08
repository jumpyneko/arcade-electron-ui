// src/povData.js
import rawPovs from "../data/povData.json" with { type: "json" };

export const POVS = rawPovs.map((p) => ({
  ...p,
  id: Number(p.id),
  isBlocked: Boolean(p.isBlocked),
  isTheOne: Boolean(p.isTheOne),
}));

export function getPovById(id) {
  const numId = Number(id);
  return POVS.find((p) => p.id === numId) ?? POVS[0];
}