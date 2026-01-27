export function init() {
    console.log("Playmode screen initialized");
  }
  
  export function render(ctx, canvas) {
    ctx.fillStyle = "#2d1b4e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PLAYMODE SCREEN", canvas.width / 2, canvas.height / 2);
  }
  
  export function cleanup() {
    // Cleanup if needed
  }