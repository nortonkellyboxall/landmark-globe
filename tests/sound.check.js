import assert from "node:assert/strict";
import { ambientKind, createSound } from "../sound.js";

assert.equal(ambientKind("space", null), "on");
assert.equal(ambientKind("landmarks", "eiffel"), "on");
assert.equal(ambientKind("landmarks", null), "duck");
assert.equal(ambientKind("wonders", ""), "duck");

let oscCount = 0;
function fakeParam() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  };
}
function fakeGain() {
  return {
    gain: fakeParam(),
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
sound.stopAmbient();
sound.setAmbientForMode("on");
assert.ok(oscCount > afterStart);

console.log("sound.check.js OK");
