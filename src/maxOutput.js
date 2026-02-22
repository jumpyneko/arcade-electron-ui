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
  
    export function startPlaymode(povId) {
        send("/startPlaymode", povId);
    }

  export function startRoulette() {
    send("/startRoulette");
  }
  
  export function startSlotMachine() {
    send("/startSlotMachine");
  }
  
  export function startInfomode() {
    send("/startInfomode");
  }
  
  export function startMiniatureSelectionMode() {
    send("/startMiniatureSelectionMode");
  }
  
  export function modelPicked(modelId) {
    send("/modelPicked", modelId);
  }
  
  export function screenChanged(screenName) {
    send("/screenChanged", screenName);
  }

  export function modelPlacedChanged(modelId, isPlaced) {
    send("/modelPlacedChanged", modelId, isPlaced ? 1 : 0);
  }