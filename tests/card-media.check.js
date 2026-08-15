import assert from "node:assert/strict";
import { cardPhotoUrl } from "../card-media.js";

const wiki960 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/960px-Tour_Eiffel_Wikimedia_Commons.jpg";
assert.equal(
  cardPhotoUrl(wiki960, 640),
  wiki960.replace("960px-", "640px-")
);
assert.equal(cardPhotoUrl(wiki960, 640).includes("640px-"), true);
assert.equal(cardPhotoUrl(wiki960, 640).includes("960px-"), false);

const other = "https://example.com/pic.jpg";
assert.equal(cardPhotoUrl(other, 640), other);

assert.equal(cardPhotoUrl("", 640), "");
assert.equal(cardPhotoUrl(null, 640), null);

console.log("card-media.check.js OK");
