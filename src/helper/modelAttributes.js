/** Reihenfolge = patriotisch → … → Demokratie */
export const MODEL_ATTRIBUTE_KEYS = [
    "patrioticHeritage",
    "nationalImage",
    "moralHygiene",
    "growthProsperity",
    "touristicDesire",
    "protectedDemocracy",
  ];
  
  /** Kurzlabels fürs UI (längere Namen brauchen auf 320×240 viel Platz) */
  export const MODEL_ATTRIBUTE_LABELS = [
    "patriotic heritage",
    "national image",
    "moral hygiene",
    "growth prosperity",
    "touristic desire",
    "protected democracy",
  ];

  export function clampAttribute(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return 0;
    return Math.max(-1, Math.min(1, n));
  }
  
  /** Länge 6, Reihenfolge wie MODEL_ATTRIBUTE_KEYS */
  export function getAttributeVector(model) {
    const attrs = model?.attributes ?? {};
    return MODEL_ATTRIBUTE_KEYS.map((k) => clampAttribute(attrs[k]));
  }