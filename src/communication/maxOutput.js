// src/maxOutput.js
import { logOsc } from "../helper/debugOverlay.js";

// Outbound messages from JS → Max (via OSC)
function send(address, ...args) {
  console.log(`[→ Max] ${address}`, args);
  logOsc("OUT", address, args);
  if (window.oscBridge) {
    const oscArgs = args.map((a) => {
      if (typeof a === "number") return { type: "i", value: a };
      return { type: "s", value: String(a) };
    });
    window.oscBridge.send(address, oscArgs);
  }
}
  
  // Notifies Max which model has been picked and its name
  export function modelPicked(modelId, modelName = "") {
    send("/modelPicked", modelId, modelName);
  }
  
  //Notifies Max that the screen has changed, so which screen is currently active
  export function screenChanged(screenName, modelId = null) {
    if (modelId === null || modelId === undefined) {
      send("/screenChanged", screenName);
    } else {
      send("/screenChanged", screenName, modelId);
    }
  }

  // Notifies Max when the title animation becomes visible after player selection.
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

  //Notifies Max that the models to choose have been selected
  export function modelsToChoose(modelId1, modelId2, modelId3) {
    send("/modelsToChoose", modelId1, modelId2, modelId3);
  }
