// src/modelData.js
import rawModels from "./data/modelData.json" with { type: "json" };

  export const models = rawModels.map(m => ({
    ...m,
    id: Number(m.id),
    isPlaced: Boolean(m.isPlaced),
  }));

  export function getModelById(id) {
    const numId = Number(id);
    return models.find(m => m.id === numId) ?? models[0];
  }

  export function changeIsPlaced(id) {
    const numId = Number(id);
    const model = models.find((m) => m.id === numId);
    if (model) {
      model.isPlaced = !model.isPlaced;
    }
    return model ?? null;
  }