import assert from "node:assert/strict";
import { ambientKind } from "../sound.js";

assert.equal(ambientKind("space", null), "on");
assert.equal(ambientKind("landmarks", "eiffel"), "on");
assert.equal(ambientKind("landmarks", null), "duck");
assert.equal(ambientKind("wonders", ""), "duck");

console.log("sound.check.js OK");
