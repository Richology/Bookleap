import test from "node:test";
import assert from "node:assert/strict";
import {
  countSelfUploadedBooks,
  shouldPromptCoffeeSupport,
} from "./supportCoffee.mjs";

test("counts only self-uploaded history records", () => {
  const records = [
    { id: "a", isStarterBook: false },
    { id: "b", isStarterBook: true },
    { id: "c" },
    { id: "a", isStarterBook: false },
  ];

  assert.equal(countSelfUploadedBooks(records), 2);
});

test("prompts after three self-uploaded books only once", () => {
  const records = [
    { id: "a", isStarterBook: false },
    { id: "b", isStarterBook: false },
    { id: "c", isStarterBook: false },
  ];

  assert.equal(shouldPromptCoffeeSupport(records, false), true);
  assert.equal(shouldPromptCoffeeSupport(records, true), false);
});

test("does not prompt when starter books bring history to three", () => {
  const records = [
    { id: "a", isStarterBook: false },
    { id: "b", isStarterBook: false },
    { id: "gift", isStarterBook: true },
  ];

  assert.equal(shouldPromptCoffeeSupport(records, false), false);
});
