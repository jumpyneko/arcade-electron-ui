import { screenManager } from "../helper/screenManager.js";
import { getModelById } from "../helper/modelData.js";
import { drawWrappedText } from "../helper/textLayout.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";
import { drawText, wrapBitmapText } from "../helper/typography.js";


let currentModel = null;
let backgroundImage = null;
let modelSprite = null;

export function init() {
  const selectedId = screenManager.sharedData.chosenModelId ?? 1;
  currentModel = getModelById(Number(selectedId));
  console.log("Modelnumber:", currentModel?.name, "id:", selectedId);

  // Load background image
  backgroundImage = new Image();
  backgroundImage.src = "assets/images/blue_bg.png";
  modelSprite = new Sprite(currentModel.image, 48, 48, 2, 16);
}

export function render(ctx, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

   // Draw background image
  if (!backgroundImage && backgroundImage.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  //Draw model sprite
  if (modelSprite) {
    modelSprite.update(); // animate like the coin
    modelSprite.draw(ctx, centerX, centerY -20, 2, 8); // position above text
  }

  // 1) Thanks for choosing
  drawText(ctx, "Thanks for choosing", centerX, 30, "h1", {
    align: "center",
    color: "white",
  });

  // 2) Model name (wrapped + yellow)
  const nameWrapped = wrapBitmapText(currentModel.name, 24);
  drawText(ctx, nameWrapped, centerX, centerY + 40, "h1", {
    align: "center",
    color: COLORS.arcadeYellow,
  });

  // 3) Outro (wrapped + white) — adjust Y so it sits below the name
  const outroWrapped = wrapBitmapText("Please pick up your model from the library and place it in the model nation.", 48);
  drawText(ctx, outroWrapped, centerX, centerY + 70, "h2", {
    align: "center",
    color: "white",
  });

}

export function onData(type, data) {
  if (type === "restartGame") {
    screenManager.restartGame();
  }
}

export function cleanup() {
  if (modelSprite) modelSprite.reset();
}