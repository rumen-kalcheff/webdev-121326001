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
## 2026-10-28 · Писане на SPEC.md и AGENTS.md (Claude Code)
- Goal: да попълня SPEC.md и AGENTS.md за Lab booking и да мина проверките на checks/ex2.mjs.
- Delegated: чернови на goals, non-goals, constraints, критериите AC-1..AC-13, секциите за model feature, auth, MCP tools и UI, и на командите и конвенциите в AGENTS.md; разяснения какво иска всяка проверка.
- Checkpoints: след всяка секция пусках node checks/ex2.mjs; от 11/30 стигнах до 29/31.
- Went wrong: нямаше достъп до точния текст на шаблона и го копирах ръчно; имаше грешка в стойностите по подразбиране за стека, които прегледах и приех.
- Changed by hand: избрах проекта, стека, GitHub като провайдър и Gemini като модел; поставих текстовете във файловете и прегледах всеки критерий.

## 2026-10-28 · Проверка, че агентът чете AGENTS.md (Gemini CLI)
- Goal: свежа сесия, която чете AGENTS.md и ми връща списъка „Always ask before".
- Delegated: само четене на AGENTS.md, без промени по файлове.
- Checkpoints: отговорът съвпада дума по дума със списъците „Always ask before" и „Never"; MCP командата е npm run mcp; /stats: 12,750 input и 163 output токена.
- Went wrong: първите два опита дадоха API_KEY_INVALID, защото в codespace-а не беше зададена GEMINI_API_KEY; добавих секрета и отворих codespace-а наново.
- Changed by hand: нищо по кода; само добавих секрета в Codespaces secrets.


## 2026-10-28 · Slice 1: план и изграждане (Gemini CLI)
- Goal: да построя slice 1 (AC-10 до AC-13): таблици със seed данни, вход и списък с лабораториите, достъпен само след вход.
- Delegated: плана, таблиците users и labs със seed, входа с bcrypt и сесии, страницата /labs, защитата за /api/labs и тестовете.
- Checkpoints: прегледах плана срещу non-goals преди одобрение; след стъпка 1 проверих таблиците с node; проверих входа с curl; npm test дава 10 passing (100% на services); в браузъра минах през AC-10 до AC-13 и изтрих ред от базата; curl без вход връща 401.
- Went wrong: тестовете трият от таблица bookings, която не съществува; агентът махна проверката, че след грешен вход браузърът остава без достъп, и използва /20/, което съвпада и с Room 202; остави резервна парола за сесията и не регенерираше сесията; моделите се превключваха и висяха, а codespace-ът се рестартира два пъти и изгуби сесиите заедно с техния /stats.
- Changed by hand: поправих двата слаби теста с sed и perl; написах бележката Spec vs result и промених AC-11 и AC-12 в SPEC.md.