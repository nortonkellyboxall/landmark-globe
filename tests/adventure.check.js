import assert from "node:assert/strict";
import { placesForContinent } from "../adventure.js";

const landmarks = [
  { id: "ny", continent: "Americas", lat: 40 },
  { id: "lima", continent: "Americas", lat: -12 },
  { id: "paris", continent: "Europe", lat: 48 },
];
const wonders = [
  { id: "grandcanyon", continent: "Americas", lat: 36 },
  { id: "patagonia", continent: "Americas", lat: -50 },
  { id: "alps", continent: "Europe", lat: 46 },
];

assert.deepEqual(
  placesForContinent("northamerica", landmarks, wonders).map((p) => p.id),
  ["ny", "grandcanyon"]
);
assert.deepEqual(
  placesForContinent("southamerica", landmarks, wonders).map((p) => p.id),
  ["lima", "patagonia"]
);
assert.deepEqual(
  placesForContinent("europe", landmarks, wonders).map((p) => p.id),
  ["paris", "alps"]
);
assert.deepEqual(placesForContinent("nope", landmarks, wonders), []);

console.log("adventure.check.js OK");
