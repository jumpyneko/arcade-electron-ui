const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { OscFileLog } = require("../src/main/oscFileLog");

function tempDir() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "console-osc-log-")), "logs");
}

function readLines(file) {
  return fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

test("each message is a JSON line naming its sender, in a per-day file", () => {
  const dir = tempDir();
  const log = new OscFileLog(dir, { now: () => new Date(2026, 8, 23, 1, 3, 24, 362) });
  log.write("CR→UI", "/placedModels", ["40 44"], { from: "192.168.10.103:50508" });
  log.write("UI→CR", "/slotSelected", [45, 24, 5]);

  const lines = readLines(path.join(dir, "osc-2026-09-23.jsonl"));
  assert.deepEqual(lines[0], {
    t: "2026-09-23 01:03:24.362",
    dir: "CR→UI",
    addr: "/placedModels",
    args: ["40 44"],
    from: "192.168.10.103:50508"
  });
  assert.equal(lines[1].addr, "/slotSelected");
});

test("only the newest keepDays files survive a new day", () => {
  const dir = tempDir();
  let day;
  const log = new OscFileLog(dir, { keepDays: 2, now: () => new Date(2026, 8, day, 12) });
  for (day = 20; day <= 23; day += 1) log.write("UI→CR", "/time", [day]);
  assert.deepEqual(fs.readdirSync(dir).sort(), ["osc-2026-09-22.jsonl", "osc-2026-09-23.jsonl"]);
});

test("a write that cannot reach the disk never throws", () => {
  const dir = tempDir();
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  fs.writeFileSync(dir, "a file where the folder should be");
  const log = new OscFileLog(dir);
  assert.doesNotThrow(() => log.write("CR→UI", "/x", []));
});
