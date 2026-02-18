// src/maxOutput.js
// Outbound messages from JS → Max
// For now these are stubs that log to console.
// When Max transport is connected, replace the internals.

export function startPlaymode(povId) {
    console.log(`[→ Max] startPlaymode(${povId})`);
    // TODO: send to Max via OSC / WebSocket / IPC
  }
  
export function startInfomode() {
    console.log(`[→ Max] startInfomode()`);
    // TODO: send to Max via OSC / WebSocket / IPC
  }

export function startMiniatureSelectionMode() {
    console.log(`[→ Max] startMiniatureSelectionMode()`);
    // TODO: send to Max via OSC / WebSocket / IPC
      }

export function modelPicked(modelId) {
console.log(`[→ Max] modelPicked(${modelId})`);
// TODO: send to Max via OSC / WebSocket / IPC
}