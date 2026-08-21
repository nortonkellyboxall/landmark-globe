import assert from "node:assert/strict";
import { LANDMARKS } from "../landmarks.js";
import { WONDERS } from "../wonders.js";
import { CONTINENTS, COUNTRIES } from "../geography.js";
import { placeById, allPlaces } from "../place.js";

assert.ok(LANDMARKS.find((p) => p.id === "eiffel"));
assert.ok(WONDERS.find((p) => p.id === "grandcanyon"));
assert.ok(CONTINENTS.find((p) => p.id === "africa"));
assert.ok(COUNTRIES.find((p) => p.id === "usa"));

assert.equal(placeById("eiffel")?.name, "Eiffel Tower");
assert.equal(placeById("grandcanyon")?.name, "Grand Canyon");
assert.equal(placeById("africa")?.kind, "continent");
assert.equal(placeById("usa")?.kind, "country");
assert.equal(placeById("mars")?.name, "Mars");
assert.equal(placeById("nope"), null);

const ids = allPlaces().map((p) => p.id);
assert.ok(ids.includes("eiffel"));
assert.ok(ids.includes("mars"));
assert.equal(new Set(ids).size, ids.length);

console.log("place.check.js OK");
