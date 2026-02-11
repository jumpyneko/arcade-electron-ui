// src/renderer.js
import { screenManager } from "./screenManager.js";
import * as startScreen from "./screens/startScreen.js";
import * as rouletteScreen from "./screens/rouletteScreen.js";
import * as playmodeScreen from "./screens/playmodeScreen.js";
import * as infomodeScreen from "./screens/infomodeScreen.js";
import * as slotmachineScreen from "./screens/slotmachineScreen.js";
import * as modelpickerScreen from "./screens/modelpickerScreen.js";
import * as endScreen from "./screens/endScreen.js";
import * as inputManager from "./inputManager.js";
window.inputManager = inputManager; // temporary, for testing

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Set canvas to 4:3 aspect ratio (e.g., 1024x768 or 1280x960)
canvas.width = 1280;  // 4:3 ratio
canvas.height = 960;  // 1280 * 3/4 = 960

// Function to resize canvas to fit window while maintaining 4:3 aspect ratio
function resizeCanvas() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  const aspectRatio = 4 / 3;
  let displayWidth = windowWidth;
  let displayHeight = windowWidth / aspectRatio;
  
  // If height is too tall, fit to height instead
  if (displayHeight > windowHeight) {
    displayHeight = windowHeight;
    displayWidth = windowHeight * aspectRatio;
  }
  
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.style.position = "absolute";
  canvas.style.left = `${(windowWidth - displayWidth) / 2}px`;
  canvas.style.top = `${(windowHeight - displayHeight) / 2}px`;
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
screenManager.register("end", endScreen);

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

// Main render loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render current screen
  screenManager.render(ctx, canvas);
  
  // Optional: Show current screen name for debugging
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(10, 10, 300, 30);
  ctx.fillStyle = "white";
  ctx.font = "14px monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    `Screen: ${screenManager.getCurrentScreen()} (${screenManager.currentIndex + 1}/${screenManager.screens.size})`,
    15,
    30
  );

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