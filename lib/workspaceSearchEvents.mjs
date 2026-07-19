const STORAGE_KEY = "bookleap_workspace_search_events_v1";
const MAX_EVENTS = 100;

export function recordWorkspaceSearchEvent(name, payload = {}, storage = globalThis.localStorage) {
  if (!storage) return;

  try {
    const existing = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    const events = Array.isArray(existing) ? existing : [];
    const nextEvent = {
      name,
      at: new Date().toISOString(),
      ...payload,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify([...events, nextEvent].slice(-MAX_EVENTS)));
  } catch {
    // Local analytics must never affect search.
  }
}

export function getWorkspaceSearchEvents(storage = globalThis.localStorage) {
  if (!storage) return [];

  try {
    const events = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}
