import assert from "node:assert/strict";
import { weatherForPlace } from "../place-weather.js";

assert.equal(weatherForPlace({ id: "antarctica" }), "snow");
assert.equal(weatherForPlace({ id: "everest" }), "snow");
assert.equal(weatherForPlace({ id: "iguazu" }), "rain");
assert.equal(weatherForPlace({ id: "iceland" }), "snow");
assert.equal(weatherForPlace({ id: "canada" }), "snow");
assert.equal(weatherForPlace({ id: "greatbarrier" }), "rain");
assert.equal(weatherForPlace({ id: "sahara" }), null);
assert.equal(weatherForPlace(null), null);
assert.equal(weatherForPlace({}), null);
assert.equal(weatherForPlace({ id: "sahara", weather: "rain" }), "rain");
assert.equal(weatherForPlace({ id: "paris", weather: "snow" }), "snow");
assert.equal(weatherForPlace({ id: "paris", weather: "fog" }), null);
assert.equal(weatherForPlace({ id: "kilimanjaro", weather: "snow" }), "snow");
assert.equal(weatherForPlace({ id: "okavango", weather: "rain" }), "rain");
assert.equal(weatherForPlace({ id: "emperors", weather: "snow" }), "snow");

console.log("place-weather.check.js OK");
