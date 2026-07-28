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
  export function screenChanged(screenName) {
    send("/screenChanged", screenName);
  }

  // Notifies Max when the title animation becomes visible after player selection.
  export function titleDisplayed() {
    send("/title");
  }

  export function rouletteSelected() {
    send("/RouletteSelected");
  }

  //Notifies Max that the models to choose have been selected
  export function modelsToChoose(modelId1, modelId2, modelId3) {
    send("/modelsToChoose", modelId1, modelId2, modelId3);
  }
