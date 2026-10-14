# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->
## 2026-10-14 · MCP сървър от нулата (Claude Code)
- Goal: да направя MCP сървър без SDK, който обработва initialize, tools/list, tools/call и грешките, и минава check.mjs (12/12).
- Delegated: обяснения на протокола (JSON-RPC, handshake, разликата между isError и error кода), ревю на кода ми, диагностика на тестовете, помощ с package.json и описанията на инструментите.
- Checkpoints: след всяка стъпка пусках тест (echo ... | node server.js); накрая check.mjs → 12/12 passed, и през npm run --silent mcp.
- Went wrong: тествах от терминала на Mac вместо в Codespace; messages.jsonl е обвита в name/expect/message, затова първият ми тест не даде отговор; сложих isError: 0 вместо true; първоначално не разбирах структурата и поисках целия код, но агентът отказа да го пише и ми даваше скелети с празни места; за някои редове (напр. JSON.stringify/parse, шаблонния низ за text) агентът ми каза точния израз, а аз го написах на ръка; отварях и решението на курса.
- Changed by hand: целият server.js е написан от мен на ръка по скелетите; описанията на двата инструмента са адаптирани от предложения.

## 2026-10-14 · Експеримент с описанието (Gemini CLI)
- Goal: да проверя дали Gemini избира инструментите и как влияе описанието.
- Delegated: Gemini CLI извика find_lecture и list_lectures; Claude Code помогна с диагностиката.
- Checkpoints: /mcp показа 2 инструмента; отговорите бяха верни.
- Went wrong: gemini-2.5-pro и gemini-3.8-flash висяха (заявките се отказваха); работи gemini-3-flash-preview; първият ми опит с „лошо“ описание не беше чист, защото не бях рестартирал Gemini.
- Changed by hand: смених описанието на find_lecture и го върнах.