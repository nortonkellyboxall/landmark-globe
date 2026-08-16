import assert from "node:assert/strict";
import { cardPhotoUrl } from "../card-media.js";

const wiki960 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/960px-Tour_Eiffel_Wikimedia_Commons.jpg";
const wiki1280 = wiki960.replace("960px-", "1280px-");

// 640 snaps up to a Wikimedia-served size (960), not an invented 640px URL
assert.equal(cardPhotoUrl(wiki960, 640), wiki960);
assert.equal(cardPhotoUrl(wiki960, 640).includes("960px-"), true);
assert.equal(cardPhotoUrl(wiki960, 640).includes("640px-"), false);
assert.equal(cardPhotoUrl(wiki1280, 640), wiki960);

const other = "https://example.com/pic.jpg";
assert.equal(cardPhotoUrl(other, 640), other);

assert.equal(cardPhotoUrl("", 640), "");
assert.equal(cardPhotoUrl(null, 640), null);

console.log("card-media.check.js OK");
