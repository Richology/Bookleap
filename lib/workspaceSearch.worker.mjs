import { getSearchTokens, getTextSearchMatch } from "./workspaceSearch.mjs";

self.onmessage = (event) => {
  const { query, documents } = event.data;
  const tokens = getSearchTokens(query);
  const matches = {};

  for (const document of documents) {
    matches[document.id] = getTextSearchMatch(document.content, query, tokens);
  }

  self.postMessage({ matches });
};
