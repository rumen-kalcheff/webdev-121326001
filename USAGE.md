# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-28 | Gemini CLI (gemini-3-flash-preview) | 12750 | 163 |  | $0.0069 |
| 2026-11-15 | Claude Code (claude-sonnet-5-5), slices 2 to 4 | not shown | not shown |  |  |

List prices: Gemini API pricing page (ai.google.dev/gemini-api/docs/pricing), paid tier, per 1M tokens.

Slice 1 sessions (Gemini CLI, gemini-3-flash-preview and gemini-3.5-flash-lite): the codespace restarted twice and the sessions ended before I could run /stats, so their tokens were not recorded and are not in the table.

Claude Code session of 2026-11-15 (slice 2 to the model and MCP, one long session): Claude Code does not show separate input and output token totals, and the plan is a subscription, so I left the tokens and the cost empty instead of guessing. What the app reports: the context window held 223,136 of 1,000,000 tokens when I wrote this row (22%). That is the size of the conversation at one moment, not the total tokens billed over the session. [TO FILL: your own numbers from the Claude usage page, and the list price you used, if you want a cost.]

Earlier Claude Code sessions (Exercises 1 and 2) are not in the table either; add a row for each if you have the figures.
