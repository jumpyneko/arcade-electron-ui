// src/maxOutput.js
// Outbound messages from JS → Max (via OSC)
function send(address, ...args) {
    console.log(`[→ Max] ${address}`, args);
    if (window.oscBridge) {
      const oscArgs = args.map(a => {
        if (typeof a === "number") return { type: "i", value: a };
        return { type: "s", value: String(a) };
      });
      window.oscBridge.send(address, oscArgs);
    }
  }
  
  // Now it sends both ModelID and ModelName.
  export function modelPicked(modelId, modelName = "") {
    send("/modelPicked", modelId, modelName);
  }
  
  export function screenChanged(screenName) {
    send("/screenChanged", screenName);
  }
