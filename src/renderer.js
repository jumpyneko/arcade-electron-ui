const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 1280;
canvas.height = 720;

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "32px monospace";
  ctx.fillText("ARCADE START", 500, 360);

  requestAnimationFrame(loop);
}

loop();
