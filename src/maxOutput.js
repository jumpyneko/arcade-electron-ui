// src/maxOutput.js
// Outbound messages from JS → Max
// For now these are stubs that log to console.
// When Max transport is connected, replace the internals.

export function startPlaymode(povId) {
    console.log(`[→ Max] startPlaymode(${povId})`);
    // TODO: send to Max via OSC / WebSocket / IPC
  }