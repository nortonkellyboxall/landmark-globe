import assert from "node:assert/strict";
import { scheduleOpen } from "../schedule-open.js";

{
  let ran = false;
  let gen = 1;
  const ok = await scheduleOpen(
    () => {
      ran = true;
    },
    { gen, getGen: () => gen, wait: () => Promise.resolve() }
  );
  assert.equal(ok, true);
  assert.equal(ran, true);
}

{
  let ran = false;
  let gen = 1;
  let resolveWait;
  const wait = () =>
    new Promise((r) => {
      resolveWait = r;
    });
  const pending = scheduleOpen(
    () => {
      ran = true;
    },
    { gen, getGen: () => gen, wait }
  );
  gen += 1;
  resolveWait();
  const ok = await pending;
  assert.equal(ok, false);
  assert.equal(ran, false);
}

console.log("schedule-open.check.js OK");
