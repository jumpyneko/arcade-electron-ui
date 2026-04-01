// src/textLayout.js
// Canvas text layout helpers (wrap + bounds + ellipsis)

function clipLineWithEllipsis(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 0 && ctx.measureText(`${out}...`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? `${out}...` : "...";
  }
  
  function breakLongWord(ctx, word, maxWidth) {
    if (ctx.measureText(word).width <= maxWidth) return [word];
    const parts = [];
    let rest = word;
  
    while (rest.length > 0) {
      let i = 1;
      while (i <= rest.length && ctx.measureText(rest.slice(0, i)).width <= maxWidth) i++;
      const take = Math.max(1, i - 1);
      parts.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
    return parts;
  }
  
  export function wrapTextLines(ctx, text, maxWidth, { breakWords = true } = {}) {
    const source = String(text ?? "");
    if (!source.trim()) return [""];
  
    const words = source.split(/\s+/);
    const lines = [];
    let current = "";
  
    for (const rawWord of words) {
      const wordParts = breakWords ? breakLongWord(ctx, rawWord, maxWidth) : [rawWord];
  
      for (const part of wordParts) {
        const test = current ? `${current} ${part}` : part;
        if (ctx.measureText(test).width <= maxWidth) {
          current = test;
        } else {
          if (current) lines.push(current);
          current = part;
        }
      }
    }
  
    if (current) lines.push(current);
    return lines;
  }
  
  export function drawWrappedText(
    ctx,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    {
      align = "left",
      maxLines = Infinity,
      overflow = "ellipsis", // "ellipsis" | "clip" | "visible"
      breakWords = true,
    } = {}
  ) {
    const allLines = wrapTextLines(ctx, text, maxWidth, { breakWords });
    let lines = allLines;
  
    if (Number.isFinite(maxLines) && allLines.length > maxLines) {
      lines = allLines.slice(0, maxLines);
      if (overflow === "ellipsis") {
        lines[maxLines - 1] = clipLineWithEllipsis(ctx, lines[maxLines - 1], maxWidth);
      }
    }
  
    const prevAlign = ctx.textAlign;
    const prevBaseline = ctx.textBaseline;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
  
    let drawX = x;
    if (align === "center") drawX = x + maxWidth / 2;
    if (align === "right") drawX = x + maxWidth;
  
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], drawX, y + i * lineHeight);
    }
  
    ctx.textAlign = prevAlign;
    ctx.textBaseline = prevBaseline;
  
    return { lines, height: lines.length * lineHeight };
  }
  
  export function drawTextInBox(
    ctx,
    text,
    boxX,
    boxY,
    boxW,
    boxH,
    {
      align = "left",
      valign = "top", // "top" | "middle" | "bottom"
      lineHeight = 24,
      maxLines,
      overflow = "ellipsis",
      breakWords = true,
      padding = 0,
    } = {}
  ) {
    const x = boxX + padding;
    const y = boxY + padding;
    const w = Math.max(0, boxW - padding * 2);
    const h = Math.max(0, boxH - padding * 2);
  
    const safeMaxLines =
      maxLines ?? Math.max(1, Math.floor(h / lineHeight));
  
    const lines = wrapTextLines(ctx, text, w, { breakWords }).slice(0, safeMaxLines);
  
    if (overflow === "ellipsis") {
      const all = wrapTextLines(ctx, text, w, { breakWords });
      if (all.length > safeMaxLines) {
        lines[safeMaxLines - 1] = clipLineWithEllipsis(ctx, lines[safeMaxLines - 1], w);
      }
    }
  
    const textHeight = lines.length * lineHeight;
    let startY = y;
    if (valign === "middle") startY = y + (h - textHeight) / 2;
    if (valign === "bottom") startY = y + (h - textHeight);
  
    return drawWrappedText(ctx, lines.join("\n"), x, startY, w, lineHeight, {
      align,
      maxLines: safeMaxLines,
      overflow,
      breakWords,
    });
  }

  export function drawPixelText(ctx, text, x, y, font, color, alphaThreshold = 80) {
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");
  
    offCtx.font = font;
    offCtx.textBaseline = "top";
  
    const metrics = offCtx.measureText(text);
    const w = Math.ceil(metrics.width) + 8;
    const h = Math.ceil(parseInt(font, 10) || 24) + 8;
  
    off.width = w;
    off.height = h;
  
    offCtx.clearRect(0, 0, w, h);
    offCtx.imageSmoothingEnabled = false;
    offCtx.font = font;
    offCtx.fillStyle = color;
    offCtx.textBaseline = "top";
    offCtx.fillText(text, 4, 4);
  
    const img = offCtx.getImageData(0, 0, w, h);
    const data = img.data;
  
    // Härten: Alpha auf 0/255 schalten
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > alphaThreshold) {
        data[i + 3] = 255;
      } else {
        data[i + 3] = 0;
      }
    }
  
    offCtx.putImageData(img, 0, 0);
  
    ctx.imageSmoothingEnabled = false;
    // x/y als Zentrum wie bei textAlign:center
    ctx.drawImage(off, Math.round(x - w / 2), Math.round(y - h / 2));
  }