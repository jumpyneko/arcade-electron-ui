const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_KEEP_DAYS = 14;

function pad(n, width = 2) {
  return String(n).padStart(width, "0");
}

function localDay(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(date) {
  return `${localDay(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/**
 * Every OSC message the console sends or receives, kept on disk with the
 * sender's address.
 *
 * The rehearsal of 2026-09-22 left no trace of what reached the console, and
 * the cause - Unreal sending /placedModels straight to it, bypassing Control
 * Room - was only visible in a packet capture. One JSON object per line, one
 * file per local day, under the app's userData `logs/`. /isAlive never reaches
 * it (logOsc filters it). Appends are synchronous and hold no file open, so a
 * finished day can be pruned; a write failure is swallowed, because the log
 * must never stop the cabinet.
 */
class OscFileLog {
  constructor(dir, { keepDays = DEFAULT_KEEP_DAYS, now = () => new Date() } = {}) {
    this.dir = dir;
    this.keepDays = keepDays;
    this.now = now;
    this.day = null;
    this.file = null;
  }

  write(direction, address, args, details = {}) {
    try {
      const date = this.now();
      this.rollTo(date);
      const line = { t: localTime(date), dir: direction, addr: address, args, ...details };
      fs.appendFileSync(this.file, `${JSON.stringify(line)}\n`, "utf8");
    } catch {
      // Deliberately silent - see the class comment.
    }
  }

  rollTo(date) {
    const day = localDay(date);
    if (day === this.day) return;
    fs.mkdirSync(this.dir, { recursive: true });
    this.day = day;
    this.file = path.join(this.dir, `osc-${day}.jsonl`);
    fs.appendFileSync(this.file, "", "utf8");
    const files = fs.readdirSync(this.dir).filter((name) => /^osc-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)).sort();
    for (const name of files.slice(0, Math.max(0, files.length - this.keepDays))) {
      try { fs.unlinkSync(path.join(this.dir, name)); } catch {}
    }
  }
}

module.exports = { OscFileLog };
