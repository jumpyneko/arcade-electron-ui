// src/screens/modelpickerScreen.js
import { screenManager } from "../screenManager.js";

let slotModels = []; // 3 models from slot machine
let btn1 = null;
let btn2 = null;
let btn3 = null;

function removeButtons() {
  [btn1, btn2, btn3].forEach((b) => {
    if (b) b.remove();
  });
  btn1 = btn2 = btn3 = null;
}

function pickModel(model) {
  const id = model.id;
  if (screenManager.sharedData.modelsLeft) {
    screenManager.sharedData.modelsLeft = screenManager.sharedData.modelsLeft.filter(
      (m) => m.id !== id
    );
  }
  removeButtons();
  const DELAY_MS = 3000; // Short delay before opening playmode
  setTimeout(() => {
          screenManager.next({ chosenModelId: id });
  }, DELAY_MS);
}

export function init() {
  console.log("Modelpicker screen initialized");
  slotModels = screenManager.sharedData.slotMachineModels || [];
  removeButtons();

  if (slotModels.length >= 1) {
    btn1 = document.createElement("button");
    btn1.textContent = `Model ${slotModels[0].id}`;
    btn1.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-200px);padding:12px 24px;font-size:18px;z-index:1001;cursor:pointer;";
    btn1.onclick = () => pickModel(slotModels[0]);
    document.body.appendChild(btn1);
  }
  if (slotModels.length >= 2) {
    btn2 = document.createElement("button");
    btn2.textContent = `Model ${slotModels[1].id}`;
    btn2.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-60px);padding:12px 24px;font-size:18px;z-index:1001;cursor:pointer;";
    btn2.onclick = () => pickModel(slotModels[1]);
    document.body.appendChild(btn2);
  }
  if (slotModels.length >= 3) {
    btn3 = document.createElement("button");
    btn3.textContent = `Model ${slotModels[2].id}`;
    btn3.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(80px);padding:12px 24px;font-size:18px;z-index:1001;cursor:pointer;";
    btn3.onclick = () => pickModel(slotModels[2]);
    document.body.appendChild(btn3);
  }
}

export function render(ctx, canvas) {
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "32px monospace";
  ctx.textAlign = "center";
  const ids = slotModels.map((m) => m.id).join(", ");
  ctx.fillText(`Choose one: ${ids}`, canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = "24px monospace";
  ctx.fillText("(click a button below)", canvas.width / 2, canvas.height / 2);
}

export function cleanup() {
  removeButtons();
}