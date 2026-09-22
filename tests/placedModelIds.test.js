const test = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs");
const path = require("node:path");

// The package is CommonJS but renderer helpers are browser ES modules, so the
// source is imported as a module from its text rather than by path.
const source = fs.readFileSync(path.join(__dirname, "../src/helper/placedModelIds.js"), "utf8");
const load = () => import(`data:text/javascript,${encodeURIComponent(source)}`);

test("Control Room's one int per miniature passes through", async () => {
  const { parsePlacedModelIds } = await load();
  assert.deepEqual(parsePlacedModelIds([40, 44, 48]), [40, 44, 48]);
});

test("Unreal's single space-separated string yields the same IDs", async () => {
  const { parsePlacedModelIds } = await load();
  assert.deepEqual(parsePlacedModelIds(["40 44 48 42"]), [40, 44, 48, 42]);
});

test("the two senders agree, so arrival order no longer matters", async () => {
  const { parsePlacedModelIds } = await load();
  const fromControlRoom = parsePlacedModelIds([2, 4, 8, 11]);
  const fromUnreal = parsePlacedModelIds(["4 8 2 11"]);
  assert.deepEqual([...fromUnreal].sort((a, b) => a - b), fromControlRoom);
});

test("an empty set stays empty and junk is dropped", async () => {
  const { parsePlacedModelIds } = await load();
  assert.deepEqual(parsePlacedModelIds([]), []);
  assert.deepEqual(parsePlacedModelIds([""]), []);
  assert.deepEqual(parsePlacedModelIds(["  12  x 7 "]), [12, 7]);
  assert.deepEqual(parsePlacedModelIds(9), [9]);
});
