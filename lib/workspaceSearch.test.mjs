import assert from "node:assert/strict";
import test from "node:test";
import {
  createSearchExcerptAt,
  getSearchTokens,
  getTextSearchMatch,
} from "./workspaceSearch.mjs";

test("multi-token search recalls content even when terms are far apart", () => {
  const content = `复盘${"。".repeat(300)}长期主义`;
  const query = "复盘 长期主义";
  const match = getTextSearchMatch(content, query, getSearchTokens(query));

  assert.ok(match);
  assert.equal(match.firstMatchIndex, 0);
});

test("missing tokens do not create a false result", () => {
  const query = "复盘 长期主义";
  assert.equal(getTextSearchMatch("只有复盘", query, getSearchTokens(query)), null);
});

test("excerpt centers the displayed context on the actual match", () => {
  const content = `${"前文".repeat(80)}命中词${"后文".repeat(80)}`;
  const excerpt = createSearchExcerptAt(content, content.indexOf("命中词"));

  assert.match(excerpt, /命中词/);
  assert.match(excerpt, /^\.\.\./);
});
