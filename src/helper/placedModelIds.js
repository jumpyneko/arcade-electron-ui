// /placedModels reaches the console from two senders in two shapes. Control Room
// sends one int argument per miniature; Unreal's BP_MiniatureManager still sends
// the same set as a single space-separated string ("40 44 48"). Number() on that
// string is NaN, so the whole set used to be dropped and every miniature offered
// again. Accept both shapes so either sender yields the same IDs.
export function parsePlacedModelIds(values) {
  const list = Array.isArray(values) ? values : [values];
  return list
    .flatMap((value) => (typeof value === "string" ? value.split(/[\s,]+/) : [value]))
    .filter((value) => value !== "" && value !== null && value !== undefined)
    .map(Number)
    .filter(Number.isInteger);
}
