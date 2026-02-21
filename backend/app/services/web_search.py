"""Web search for the chat pipeline. Supports DuckDuckGo (no key) and SerpAPI (API key)."""

import os
import requests


def _search_duckduckgo(query: str, max_results: int = 8) -> str:
    """Search via DuckDuckGo; returns formatted string of results or error message."""
    if not query or not str(query).strip():
        return "Error: empty search query."
    try:
        from duckduckgo_search import DDGS

        ddgs = DDGS()
        results = list(ddgs.text(str(query).strip(), max_results=max_results))
    except Exception as e:
        return f"DuckDuckGo search failed: {e!s}"

    if not results:
        return "No results found for that query. Try a more specific query (e.g. 'weather Lamoni Iowa' or 'today news headlines')."

    lines = []
    for i, r in enumerate(results, 1):
        title = (r.get("title") or "").strip()
        body = (r.get("body") or "").strip()
        href = (r.get("href") or "").strip()
        lines.append(f"{i}. {title}\n   {body}\n   URL: {href}")
    return "\n\n".join(lines)


def _search_serpapi(query: str, max_results: int = 8) -> str:
    """Search via SerpAPI Google; returns formatted string of results or error message."""
    if not query or not str(query).strip():
        return "Error: empty search query."
    api_key = os.getenv("SERPAPI_API_KEY") or os.getenv("SerpAPI")
    if not api_key or not api_key.strip():
        return "SerpAPI is not configured. Set SERPAPI_API_KEY (or SerpAPI) in .env."

    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params={
                "engine": "google",
                "q": str(query).strip(),
                "api_key": api_key.strip(),
                "num": min(max_results, 20),
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return f"SerpAPI request failed: {e!s}"
    except Exception as e:
        return f"SerpAPI error: {e!s}"

    results = data.get("organic_results") or []
    if not results:
        return "No results found for that query. Try a more specific query (e.g. 'weather Lamoni Iowa' or 'today news headlines')."

    lines = []
    for i, r in enumerate(results[:max_results], 1):
        title = (r.get("title") or "").strip()
        snippet = (r.get("snippet") or "").strip()
        link = (r.get("link") or "").strip()
        lines.append(f"{i}. {title}\n   {snippet}\n   URL: {link}")
    return "\n\n".join(lines)


def search_web(query: str, max_results: int = 8, provider: str | None = None) -> str:
    """
    Run a web search and return a single string of results (title, snippet, URL per result).
    Provider: 'duckduckgo' | 'serpapi' | None (use env WEB_SEARCH_PROVIDER, default duckduckgo).
    Returns an error message string if search fails.
    """
    if provider is None:
        provider = (os.getenv("WEB_SEARCH_PROVIDER") or "duckduckgo").strip().lower()
    if provider == "serpapi":
        return _search_serpapi(query, max_results=max_results)
    return _search_duckduckgo(query, max_results=max_results)
