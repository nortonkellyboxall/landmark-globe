import assert from "node:assert/strict";
import { weatherForPlace } from "../place-weather.js";

assert.equal(weatherForPlace({ id: "antarctica" }), "snow");
assert.equal(weatherForPlace({ id: "everest" }), "snow");
assert.equal(weatherForPlace({ id: "iguazu" }), "rain");
assert.equal(weatherForPlace({ id: "sahara" }), null);
assert.equal(weatherForPlace(null), null);
assert.equal(weatherForPlace({}), null);

console.log("place-weather.check.js OK");
