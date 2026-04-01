// src/bitmapFont.js
export async function loadBitmapFont(pngPath, xmlPath) {
    const img = new Image();
    img.src = pngPath;
    await img.decode();
  
    const xmlText = await fetch(xmlPath).then((r) => r.text());
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  
    const common = xml.querySelector("common");
    const lineHeight = Number(common?.getAttribute("lineHeight") ?? 6);
  
    const chars = new Map();
    xml.querySelectorAll("char").forEach((node) => {
      const id = Number(node.getAttribute("id"));
      chars.set(id, {
        x: Number(node.getAttribute("x")),
        y: Number(node.getAttribute("y")),
        w: Number(node.getAttribute("width")),
        h: Number(node.getAttribute("height")),
        xadvance: Number(node.getAttribute("xadvance")),
        xoffset: Number(node.getAttribute("xoffset") ?? 0),
        yoffset: Number(node.getAttribute("yoffset") ?? 0),
      });
    });
  
    return { img, chars, lineHeight };
  }
  
  export function drawBitmapText(ctx, font, text, x, y, { scale = 3, align = "left", color = null } = {}) {
    if (!font) return;
  
    const lines = text.split("\n");
  
    // einfache Textbreite pro Zeile berechnen
    const lineWidths = lines.map((line) => {
      let w = 0;
      for (const ch of line) {
        const code = ch.charCodeAt(0);
        const g = font.chars.get(code) || font.chars.get(32); // fallback space
        if (g) w += g.xadvance * scale;
      }
      return w;
    });
  
    ctx.imageSmoothingEnabled = false;
  
    lines.forEach((line, li) => {
      let penX = x;
      if (align === "center") penX -= Math.round(lineWidths[li] / 2);
      if (align === "right") penX -= lineWidths[li];
  
      const penY = y + li * font.lineHeight * scale;
  
      for (const ch of line) {
        const code = ch.charCodeAt(0);
        const g = font.chars.get(code) || font.chars.get(32);
        if (!g) continue;
  
        const dx = Math.round(penX + g.xoffset * scale);
        const dy = Math.round(penY + g.yoffset * scale);
  
        if (!color) {
          ctx.drawImage(font.img, g.x, g.y, g.w, g.h, dx, dy, g.w * scale, g.h * scale);
        } else {
          // tint glyph via tiny offscreen canvas
          const tw = g.w * scale;
          const th = g.h * scale;
          const tint = document.createElement("canvas");
          tint.width = tw;
          tint.height = th;
          const tctx = tint.getContext("2d");
          tctx.imageSmoothingEnabled = false;
        
          // draw glyph
          tctx.drawImage(font.img, g.x, g.y, g.w, g.h, 0, 0, tw, th);
        
          // keep glyph alpha, replace RGB with chosen color
          tctx.globalCompositeOperation = "source-in";
          tctx.fillStyle = color;
          tctx.fillRect(0, 0, tw, th);
        
          ctx.drawImage(tint, dx, dy);
        }
        penX += g.xadvance * scale;
      }
    });
  }