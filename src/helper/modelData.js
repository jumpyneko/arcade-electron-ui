// src/modelData.js
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

const rawModels = loadLocalJson("../data/modelData.json");

  export const models = rawModels.map(m => ({
    ...m,
    id: Number(m.id),
    isPlaced: Boolean(m.isPlaced),
  }));

  export function getModelById(id) {
    const numId = Number(id);
    return models.find(m => m.id === numId) ?? models[0];
  }

  export function setModelPlaced(id, isPlaced = true) {
    const model = models.find((m) => m.id === Number(id));
    if (model) model.isPlaced = isPlaced;
    return model ?? null;
  }

  export function getUnplacedModels() {
    return models.filter((m) => !m.isPlaced).map((m) => ({ ...m }));
  }

  export function applyPlacedModelIds(ids) {
    const placedSet = new Set(
      ids.map(id => Number(id)).filter(n => !Number.isNaN(n))
    );
  
    for (const model of models) {
      model.isPlaced = placedSet.has(model.id);
    }
  
    return models;
  }
