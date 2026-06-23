// src/povData.js
function loadLocalJson(path) {
  const request = new XMLHttpRequest();
  request.open("GET", new URL(path, import.meta.url), false);
  request.overrideMimeType("application/json");
  request.send(null);

  if (request.status !== 0 && (request.status < 200 || request.status >= 300)) {
    throw new Error(`Failed to load ${path}: ${request.status}`);
  }

  return JSON.parse(request.responseText);
}

const rawPovs = loadLocalJson("../data/povData.json");

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
