export type WorkspaceSearchEventName =
  | "search_opened"
  | "search_query_changed"
  | "search_result_opened"
  | "search_empty"
  | "search_filter_changed";

export function recordWorkspaceSearchEvent(
  name: WorkspaceSearchEventName,
  payload?: Record<string, string | number | boolean | undefined>
): void;

export function getWorkspaceSearchEvents(): Array<Record<string, unknown>>;
