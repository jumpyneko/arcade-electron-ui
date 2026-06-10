// src/modelData.js
import rawModels from "../data/modelData.json" with { type: "json" };

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