import assert from "node:assert/strict";
import test from "node:test";
import { getWorkspaceSearchEvents, recordWorkspaceSearchEvent } from "./workspaceSearchEvents.mjs";

test("search events retain metadata without query text", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  recordWorkspaceSearchEvent("search_query_changed", { queryLength: 4, hasResults: true }, storage);
  const [event] = getWorkspaceSearchEvents(storage);

  assert.equal(event.name, "search_query_changed");
  assert.equal(event.queryLength, 4);
  assert.equal("query" in event, false);
});
