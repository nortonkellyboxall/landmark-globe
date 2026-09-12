import assert from "node:assert/strict";
import { LANDMARKS } from "../landmarks.js";
import { WONDERS } from "../wonders.js";
import { CONTINENTS, COUNTRIES } from "../geography.js";
import { DATASETS } from "../adventure.js";
import { placeById, allPlaces } from "../place.js";

assert.ok(LANDMARKS.find((p) => p.id === "eiffel"));
assert.ok(LANDMARKS.find((p) => p.id === "greatzimbabwe"));
assert.ok(LANDMARKS.find((p) => p.id === "lalibela"));
assert.equal(placeById("greatzimbabwe")?.continent, "Africa");
assert.equal(placeById("lalibela")?.continent, "Africa");
assert.ok(WONDERS.find((p) => p.id === "grandcanyon"));
assert.ok(WONDERS.find((p) => p.id === "kilimanjaro"));
assert.ok(WONDERS.find((p) => p.id === "okavango"));
assert.equal(placeById("kilimanjaro")?.weather, "snow");
assert.equal(placeById("okavango")?.weather, "rain");
assert.ok(WONDERS.find((p) => p.id === "emperors"));
assert.equal(placeById("emperors")?.continent, "Antarctica");
assert.equal(placeById("emperors")?.weather, "snow");
assert.ok(CONTINENTS.find((p) => p.id === "africa"));

assert.ok(COUNTRIES.find((p) => p.id === "usa"));
assert.ok(COUNTRIES.find((p) => p.id === "norway"));
assert.ok(COUNTRIES.find((p) => p.id === "vietnam"));
assert.ok(COUNTRIES.find((p) => p.id === "fiji"));
assert.ok(COUNTRIES.length >= 40);

assert.equal(placeById("eiffel")?.name, "Eiffel Tower");
assert.equal(placeById("grandcanyon")?.name, "Grand Canyon");
assert.equal(placeById("africa")?.kind, "continent");
assert.equal(placeById("usa")?.kind, "country");
assert.equal(placeById("mars")?.name, "Mars");
assert.equal(placeById("iss")?.kind, "station");
assert.equal(placeById("iss")?.name, "The ISS");
assert.equal(placeById("nope"), null);

const ids = allPlaces().map((p) => p.id);
assert.ok(ids.includes("eiffel"));
assert.ok(ids.includes("mars"));
assert.ok(ids.includes("iss"));
assert.equal(new Set(ids).size, ids.length);
for (const tab of Object.keys(DATASETS)) {
  assert.equal(
    DATASETS[tab].items.some((p) => p.id === "iss"),
    false,
    `${tab} pool must omit iss`
  );
}

console.log("place.check.js OK");
