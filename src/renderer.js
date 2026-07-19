// src/renderer.js
import { screenManager } from "./helper/screenManager.js";
import * as startScreen from "./screens/startScreen.js";
import * as rouletteStripScreen from "./screens/rouletteStripScreen.js";
import * as playmodeScreen from "./screens/playmodeScreen.js";
import * as infomodeScreen from "./screens/infomodeScreen.js";
import * as slotmachineScreen from "./screens/slotmachineScreen.js";
import * as modelpickerScreen from "./screens/modelpickerScreen.js";
import * as nameScreen from "./screens/nameScreen.js";
import * as endScreen from "./screens/endScreen.js";
import * as inputManager from "./communication/inputManager.js";
import { audioManager } from "./helper/audioManager.js";
import { initTypography } from "./helper/typography.js";
import { screenChanged } from "./communication/maxOutput.js";

window.audioManager = audioManager; // temporary, for testing
window.inputManager = inputManager; // temporary, for testing

audioManager.registerMany({
  obertura: "assets/sounds/obertura.wav",
  coinIn: "assets/sounds/coin.wav",
  select1: "assets/sounds/SELECT.wav",
  select2: "assets/sounds/SELECT_2.wav",
  roulette: "assets/sounds/roulette.wav",
  povStart: "assets/sounds/POV-INIT.wav",
  text: "assets/sounds/text.wav",
  slot: "assets/sounds/slot.wav",
  slot1: "assets/sounds/slot1.wav",
  slot2: "assets/sounds/slot2.wav",
  slot3: "assets/sounds/slot3.wav",
  timer: "assets/sounds/timer.wav",
  textSolo: "assets/sounds/textSolo.wav",
  tvOff: "assets/sounds/tvOff.wav",
  miniatureFinal: "assets/sounds/miniatureFinal.wav",
  timeUp: "assets/sounds/timeUp.wav"
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
  
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.style.position = "absolute";
  canvas.style.left = `${Math.round((windowWidth - displayWidth) / 2)}px`;
  canvas.style.top  = `${Math.round((windowHeight - displayHeight) / 2)}px`;
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener("resize", resizeCanvas);

// Register all screens
screenManager.register("start", startScreen);
screenManager.register("rouletteStrip", rouletteStripScreen);
screenManager.register("playmode", playmodeScreen);
screenManager.register("infomode", infomodeScreen);
screenManager.register("slotmachine", slotmachineScreen);
screenManager.register("modelpicker", modelpickerScreen);
screenManager.register("nameScreen", nameScreen);   // Added new nameScreen to register.
screenManager.register("end", endScreen);

// Init first screen
screenManager.start()

// Test button for navigation (hidden by default, toggle with P)
let testButton = null;
let testButtonScreen = null;
let testButtonVisible = false;


function createTestButton() {
  if (testButton) return;
  testButton = document.createElement("button");
  testButton.style.position = "fixed";
  testButton.style.bottom = "100px";
  testButton.style.right = "200";
  testButton.style.padding = "10px 20px";
  testButton.style.fontSize = "16px";
  testButton.style.zIndex = "1000";
  testButton.style.cursor = "pointer";
  testButton.style.display = "none"; // hidden by default
  document.body.appendChild(testButton);
}

function updateTestButton() {
  createTestButton();
  testButton.style.display = testButtonVisible ? "" : "none";
  if (!testButtonVisible) return;
  const screen = screenManager.getCurrentScreen();
  if (screen === testButtonScreen) return;
  testButtonScreen = screen;
  if (screen === "end") {
    testButton.textContent = "Restart Game";
    testButton.onclick = () => screenManager.restartGame();
  } else {
    testButton.textContent = "Next Screen";
    testButton.onclick = () => screenManager.next();
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "p") return;
  testButtonVisible = !testButtonVisible;
  testButtonScreen = null; // force label refresh when shown again
  updateTestButton();
});

// Main render loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  // Render current screen
  screenManager.render(ctx, canvas);

  updateTestButton();

  requestAnimationFrame(loop);
}

loop();