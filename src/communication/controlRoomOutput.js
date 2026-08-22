function send(address, ...args) {
  console.log(`[→ Control Room] ${address}`, args);
  if (!window.consoleBridge) return;

  const oscArgs = args.map((value) => {
    if (typeof value === "number") return { type: "i", value };
    return { type: "s", value: String(value) };
  });
  window.consoleBridge.sendToControlRoom(address, oscArgs);
}

export function modelPicked(modelId, modelName = "") {
  send("/modelPicked", modelId, modelName);
}

export function screenChanged(screenName, modelId = null) {
  if (modelId === null || modelId === undefined) send("/screenChanged", screenName);
  else send("/screenChanged", screenName, modelId);
}

export function titleDisplayed() {
  send("/title");
}

export function rouletteSelected() {
  send("/RouletteSelected");
}

export function slotSelected(modelId1, modelId2, modelId3) {
  send("/slotSelected", modelId1, modelId2, modelId3);
}

export function pickerSelected(selectedId, otherId1, otherId2) {
  send("/pickerSelected", selectedId, otherId1, otherId2);
}

export function reshuffled() {
  send("/reshuffle");
}

export function modelsToChoose(modelId1, modelId2, modelId3) {
  send("/modelsToChoose", modelId1, modelId2, modelId3);
}
