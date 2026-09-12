import assert from "node:assert/strict";
import { focusStealsSpace } from "../keys.js";

assert.equal(focusStealsSpace(null), false);
assert.equal(focusStealsSpace(undefined), false);
assert.equal(focusStealsSpace({ tagName: "BODY" }), false);
assert.equal(focusStealsSpace({ tagName: "HTML" }), false);

assert.equal(focusStealsSpace({ tagName: "BUTTON" }), true);
assert.equal(focusStealsSpace({ tagName: "INPUT" }), true);
assert.equal(focusStealsSpace({ tagName: "SELECT" }), true);
assert.equal(focusStealsSpace({ tagName: "TEXTAREA" }), true);
assert.equal(focusStealsSpace({ tagName: "A" }), true);
assert.equal(focusStealsSpace({ tagName: "SUMMARY" }), true);
assert.equal(focusStealsSpace({ tagName: "DIV", isContentEditable: true }), true);

assert.equal(
  focusStealsSpace({
    tagName: "DIV",
    getAttribute: (name) => (name === "role" ? "tab" : null),
  }),
  true
);
assert.equal(
  focusStealsSpace({
    tagName: "DIV",
    getAttribute: (name) => (name === "role" ? "button" : null),
  }),
  true
);
assert.equal(
  focusStealsSpace({
    tagName: "DIV",
    getAttribute: (name) => (name === "role" ? "switch" : null),
  }),
  true
);

assert.equal(
  focusStealsSpace({
    tagName: "DIV",
    getAttribute: () => null,
  }),
  false
);

console.log("keys.check.js OK");
