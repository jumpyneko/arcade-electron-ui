// src/renderer.js
import { screenManager } from "./helper/screenManager.js";
import * as startScreen from "./screens/startScreen.js";
import * as rouletteScreen from "./screens/rouletteScreen.js";
import * as playmodeScreen from "./screens/playmodeScreen.js";
import * as infomodeScreen from "./screens/infomodeScreen.js";
import * as slotmachineScreen from "./screens/slotmachineScreen.js";
import * as modelpickerScreen from "./screens/modelpickerScreen.js";
import * as nameScreen from "./screens/nameScreen.js";
import * as endScreen from "./screens/endScreen.js";
import * as inputManager from "./communication/inputManager.js";
import { audioManager } from "./helper/audioManager.js";
import { initTypography } from "./helper/typography.js";
import * as rouletteStripScreen from "./screens/rouletteStripScreen.js";

window.audioManager = audioManager; // temporary, for testing
window.inputManager = inputManager; // temporary, for testing

audioManager.registerMany({
  obertura: "assets/sounds/obertura.wav",
  coinIn: "assets/sounds/COIN_IN.wav",
  select1: "assets/sounds/SELECT.wav",
  select2: "assets/sounds/SELECT_2.wav",
  roulette: "assets/sounds/roulette.wav",
  text: "assets/sounds/text.wav",
  slot: "assets/sounds/slot.wav",
  slot1: "assets/sounds/slot1.wav",
  slot2: "assets/sounds/slot2.wav",
  slot3: "assets/sounds/slot3.wav",
  timer: "assets/sounds/timer.wav",

  // buttonClick: "assets/sounds/button_click.wav",
  // error: "assets/sounds/error.wav",
});

audioManager.preload();

initTypography().catch(console.error);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Set canvas to 4:3 aspect ratio (e.g., 1024x768 or 1280x960)
const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 240;
canvas.width = INTERNAL_WIDTH;
canvas.height = INTERNAL_HEIGHT;

// Function to resize canvas to fit window while maintaining 4:3 aspect ratio
function resizeCanvas() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  /*const aspectRatio = 4 / 3;
  let displayWidth = windowWidth;
  let displayHeight = windowWidth / aspectRatio;*/

  const scale = Math.max(1, Math.floor(Math.min(
    window.innerWidth / INTERNAL_WIDTH,
    window.innerHeight / INTERNAL_HEIGHT
  )));
  const displayWidth = INTERNAL_WIDTH * scale;
  const displayHeight = INTERNAL_HEIGHT * scale;
  
  // If height is too tall, fit to height instead
  if (displayHeight > windowHeight) {
    displayHeight = windowHeight;
    displayWidth = windowHeight * aspectRatio;
  }
  
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.style.position = "absolute";
  canvas.style.left = `${Math.round((windowWidth - displayWidth) / 2)}px`;
  canvas.style.top  = `${Math.round((windowHeight - displayHeight) / 2)}px`;
}

function drawCrtOverlay(ctx, canvas, t) {
  ctx.save();

  // 1) scanlines
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  // 2) vignette
  const g = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.75
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3) subtle flicker
  ctx.globalAlpha = 0.03 + Math.random() * 0.02;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener("resize", resizeCanvas);

// Register all screens
screenManager.register("start", startScreen);
screenManager.register("roulette", rouletteScreen);
screenManager.register("playmode", playmodeScreen);
screenManager.register("infomode", infomodeScreen);
screenManager.register("slotmachine", slotmachineScreen);
screenManager.register("modelpicker", modelpickerScreen);
screenManager.register("nameScreen", nameScreen);   // Added new nameScreen to register.
screenManager.register("end", endScreen);
screenManager.register("rouletteStrip", rouletteStripScreen);

// Initialize first screen
const firstScreen = screenManager.getCurrentScreen();
const firstScreenData = screenManager.screens.get(firstScreen);
if (firstScreenData?.init) {
  firstScreenData.init();
}

// Test button for navigation (remove in production)
let testButton = null;
function createTestButton() {
  testButton = document.createElement("button");
  testButton.textContent = "Next Screen";
  testButton.style.position = "fixed";
  testButton.style.bottom = "20px";
  testButton.style.right = "20px";
  testButton.style.padding = "10px 20px";
  testButton.style.fontSize = "16px";
  testButton.style.zIndex = "1000";
  testButton.style.cursor = "pointer";
  testButton.onclick = () => {
    screenManager.next();
  };
  document.body.appendChild(testButton);
}

// Create test button
createTestButton();

//preload font
document.fonts.load('24px "Early GameBoy"').then(() => {
  console.log("Early GameBoy font loaded");
});

// Main render loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render current screen
  screenManager.render(ctx, canvas);
  //drawCrtOverlay(ctx, canvas, performance.now());

  // Optional: Show current screen name for debugging
  /*ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(10, 10, 300, 30);
  ctx.fillStyle = "white";
  ctx.font = "14px monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    `Screen: ${screenManager.getCurrentScreen()} (${screenManager.currentIndex + 1}/${screenManager.screens.size})`,
    15,
    30
  );*/

  requestAnimationFrame(loop);
}

loop();

// Example usage of setting a transition animation
/*screenManager.setTransitionAnimation(async () => {
  // Fade out
  await fadeOut(ctx, canvas, 500);
  // Fade in
  await fadeIn(ctx, canvas, 500);
});*/
