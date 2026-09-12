import assert from "node:assert/strict";
import { setSpeechMuted, isSpeechMuted, stopSpeech, speakName } from "../speak.js";

setSpeechMuted(false);
assert.equal(isSpeechMuted(), false);

setSpeechMuted(true);
assert.equal(isSpeechMuted(), true);

const OrigAudio = globalThis.Audio;
let constructed = 0;
globalThis.Audio = class {
  constructor() {
    constructed += 1;
  }
  play() {
    return Promise.resolve();
  }
  pause() {}
  removeAttribute() {}
  load() {}
  set onended(_) {}
  set onerror(_) {}
};

speakName({ id: "eiffel" });
assert.equal(constructed, 0, "muted speak must not construct Audio");

setSpeechMuted(false);
speakName({ id: "eiffel" });
assert.equal(constructed, 1, "unmuted speak constructs Audio");

stopSpeech();
globalThis.Audio = OrigAudio;

console.log("speak-mute.check.js OK");
