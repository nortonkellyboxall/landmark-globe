import assert from "node:assert/strict";
import { ambientKind, createSound, AMBIENT_GAIN } from "../sound.js";

assert.equal(ambientKind("space", null), "on");
assert.equal(ambientKind("landmarks", "eiffel"), "on");
assert.equal(ambientKind("landmarks", null), "duck");
assert.equal(ambientKind("wonders", ""), "duck");
assert.equal(AMBIENT_GAIN.on, 0.045);
assert.equal(AMBIENT_GAIN.duck, 0.028);

let oscCount = 0;
const targets = [];

function fakeParam(initial = 0) {
  const param = {
    value: initial,
    setValueAtTime(v) {
      param.value = v;
    },
    exponentialRampToValueAtTime(v) {
      param.value = v;
      targets.push(v);
    },
    setTargetAtTime(v) {
      param.value = v;
      targets.push(v);
    },
    cancelScheduledValues() {},
  };
  return param;
}
function fakeGain() {
  return {
    gain: fakeParam(0.0001),
    connect() {},
    disconnect() {},
  };
}
function createAudioContext() {
  return {
    currentTime: 0,
    state: "running",
    destination: {},
    createGain: fakeGain,
    createOscillator() {
      oscCount += 1;
      return {
        type: "sine",
        frequency: fakeParam(),
        connect() {},
        start() {},
        stop() {},
      };
    },
    resume() {},
  };
}

const sound = createSound({ createAudioContext });
sound.ensureAudio();
sound.setAmbientForMode("on");
const afterStart = oscCount;
assert.ok(afterStart > 0);
assert.ok(targets.includes(AMBIENT_GAIN.on));

targets.length = 0;
sound.setAmbientForMode("duck");
assert.equal(oscCount, afterStart, "duck reuses existing pads");
assert.ok(targets.includes(AMBIENT_GAIN.duck));

targets.length = 0;
sound.setAmbientForMode("on");
assert.equal(oscCount, afterStart, "on reuses existing pads");
assert.ok(targets.includes(AMBIENT_GAIN.on), "on restores full gain");

sound.stopAmbient();
targets.length = 0;
oscCount = 0;
sound.setAmbientForMode("duck");
assert.ok(oscCount > 0, "duck without pads starts ambient");
assert.ok(targets.includes(AMBIENT_GAIN.duck), "fresh duck starts at duck gain");

sound.stopAmbient();
sound.setAmbientForMode("on");
assert.ok(oscCount > 0);

console.log("sound.check.js OK");
