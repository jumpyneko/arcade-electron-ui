let backgroundImage = null;

export function init() {
    // Initialize start screen state
    console.log("Start screen initialized");
    
    // Load background image
    backgroundImage = new Image();
    backgroundImage.src = "assets/StartScreen.png";
  }
  
  export function render(ctx, canvas) {
    // Draw start screen background image
    if (backgroundImage && backgroundImage.complete) {
      // Draw image to fill the entire canvas
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(backgroundImage, 0, 0, 180, 180, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback background while image loads
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Optional: Keep text overlay if needed
    // ctx.fillStyle = "white";
    // ctx.font = "48px monospace";
    // ctx.textAlign = "center";
    // ctx.fillText("START SCREEN", canvas.width / 2, canvas.height / 2);
    // ctx.font = "24px monospace";
    // ctx.fillText("Press button to continue", canvas.width / 2, canvas.height / 2 + 50);
  }
  
  export function cleanup() {
    // Cleanup if needed
  }