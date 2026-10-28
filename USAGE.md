# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-28 | Gemini CLI (gemini-3-flash-preview) | 12750 | 163 |  | $0.0069 |

List prices: Gemini API pricing page (ai.google.dev/gemini-api/docs/pricing), paid tier, per 1M tokens.

Slice 1 sessions (Gemini CLI, gemini-3-flash-preview and gemini-3.5-flash-lite): the codespace restarted twice and the sessions ended before I could run /stats, so their tokens were not recorded and are not in the table.
