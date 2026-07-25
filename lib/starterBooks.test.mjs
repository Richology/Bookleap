import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(process.cwd(), "public", "starter-books");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
const analysisKeys = [
  "summary",
  "readingGuide",
  "viewMap",
  "actionExtraction",
  "viewValidation",
  "ideaSourceTracing",
  "originalReadingValue",
  "workspaceQuote",
];

test("every starter package is complete and has displayable evidence", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.books.length, 3);

  for (const book of manifest.books) {
    const filename = book.packageUrl.split("/").at(-1);
    const pack = JSON.parse(readFileSync(path.join(root, filename), "utf8"));

    assert.equal(pack.contentVersion, book.contentVersion);
    assert.equal(pack.schemaVersion, 1);
    assert.equal(pack.book.id, book.id);
    assert.equal(pack.book.contentVersion, book.contentVersion);
    assert.equal(pack.contentOriginLabel, "内容来自网络");
    for (const key of analysisKeys) assert.ok(pack.analysis[key]?.trim(), `${book.id}:${key}`);

    assert.equal(Object.keys(pack.evidence).length, 6);
    for (const evidence of Object.values(pack.evidence)) {
      assert.ok(evidence.claims.length > 0, `${book.id}:missing claims`);
      for (const claim of evidence.claims) {
        assert.ok(claim.excerpts.length > 0, `${book.id}:missing excerpts`);
        for (const excerpt of claim.excerpts) assert.ok(excerpt.quote.trim(), `${book.id}:empty quote`);
      }
    }

    assert.deepEqual(
      Object.fromEntries(Object.entries(pack.practiceRounds).map(([capital, round]) => [capital, round.scenarios.length])),
      { "财富积累": 3, "健康增值": 3, "关系丰盈": 3 },
      `${book.id}:practice rounds are incomplete`
    );

    for (const style of ["magazine", "swiss"]) {
      const html = readFileSync(path.join(root, `${book.id}.${style}.html`), "utf8");
      assert.ok(html.startsWith("<!DOCTYPE html>"), `${book.id}:${style} is not HTML`);
      assert.ok(html.length > 50_000, `${book.id}:${style} is unexpectedly small`);
    }
  }
});
