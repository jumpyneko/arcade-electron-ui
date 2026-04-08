import { screenManager } from "../helper/screenManager.js";
import { models, getModelById } from "../helper/modelData.js";
import { drawWrappedText } from "../helper/textLayout.js";
import { COLORS } from "../helper/colors.js";
import { Sprite } from "../helper/sprite.js";


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
  modelSprite = new Sprite("assets/sprites/model_place_25.png", 32, 32, 2, 14);
}

export function render(ctx, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const displayName = currentModel.name;

   // Draw background image
  if (backgroundImage && backgroundImage.complete) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  //Draw model sprite
  if (modelSprite) {
    modelSprite.update(); // animate like the coin
    modelSprite.draw(ctx, centerX, centerY - 200, 8); // position above text
  }

  ctx.textAlign = "center";

  // shared text area
  const maxWidth = canvas.width - 220;
  const boxX = (canvas.width - maxWidth) / 2;

  // 1) Thanks for choosing
  ctx.fillStyle = "white";
  ctx.font = '44px "Early GameBoy"';
  ctx.fillText("Thanks for choosing", centerX, centerY);

  // 2) Model name in different color
  ctx.fillStyle = COLORS.arcadeYellow; // or COLORS.arcadeOrange
  ctx.font = '48px "Early GameBoy"';
  drawWrappedText(
    ctx,
    currentModel.name,
    boxX,
    centerY + 100,
    maxWidth,
    48,
    { align: "center", maxLines: 3, overflow: "ellipsis" }
  );

  // 3) Wrapped instruction paragraph
  ctx.fillStyle = "white";
  ctx.font = '34px "Early GameBoy"';
  drawWrappedText(
    ctx,
    currentModel.outro,
    boxX,
    centerY + 200,
    maxWidth,
    48,
    { align: "center", maxLines: 3, overflow: "ellipsis" }
  );

}

export function onData(type, data) {
  if (type === "restartGame") {
    screenManager.restartGame();
  }
}

export function cleanup() {
  if (modelSprite) modelSprite.reset();
}