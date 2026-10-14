# Exercise 1 · MCP server

Your hand-written MCP server lives in this folder. Write it in any language you like. The full task is on the exercise page; this file is the short version plus your notes.

## What is already here

| File | What it is |
|---|---|
| `lectures.json` | The course lectures. Your first tool reads this file. |
| `messages.jsonl` | The messages a client sends, in order, with what your server must answer. |
| `check.mjs` | The self-check. It starts your server, sends those messages and tells you what is wrong. |

## The two tools

1. **`find_lecture`**: everyone writes this one. Input: `number` (1 to 10). It returns the title and topics of that lecture from `lectures.json`. A number outside the range is not a crash and not a protocol error: it is a result with `isError: true` and a readable message.
2. **One of your own**: anything useful that reads local data. Give it a description a model can choose by. Every tool needs one: the self-check applies the same rule to all of them, because a description is the only thing a model reads when it decides what to call.

## Where this goes next

Do not throw this folder away after Exercise 1. From Exercise 3 it becomes **your project's own MCP server**: the same protocol loop, with the tools rewired from `lectures.json` to your real data. Its tools call exactly the same service functions your HTTP routes call, so a tool obeys the same rules an API request does, and it carries a user (the `MCP_TOKEN` in `.env.example`) so it may do what that person may do and no more.

That is the whole design, and it is one sentence: **one set of rules, two front doors.** An MCP tool that writes its own database query is a second way into your data with none of your rules on it, and Exercise 5 is very good at finding those.

Add an `mcp` script to `package.json` (`"mcp": "node mcp-server/server.js"`) so your agent, CI and the lecturer can all start the server the same way.

## Run the self-check

```bash
node mcp-server/check.mjs -- <your start command>
# for example
node mcp-server/check.mjs -- node mcp-server/server.js
node mcp-server/check.mjs -- python3 mcp-server/server.py
# once you have added the mcp script
node mcp-server/check.mjs -- npm run --silent mcp
```

It prints one line per check. Fix the failures yourself: the agent may explain a message or review your handler, but it must not write the protocol code for you.

## How to start it
<!-- The exact command, so the lecturer can run your server too. -->

## Session transcript
```
npm run --silent mcp
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"manual","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"lecture-server","version":"1.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}

{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"find_lecture","description":"Намира лекция от курса по нейния номер и връща заглавието и темите ѝ. Използвай, когато потребителят пита за конкретна лекция.","inputSchema":{"type":"object","properties":{"number":{"type":"integer","description":"Номерът на лекцията (цяло число, започва от 1)."}},"required":["number"]}},{"name":"list_lectures","description":"Връща списък с всички лекции в курса: номер и заглавие на всяка. Използвай, когато потребителят пита какви лекции има или не знае номера на лекцията.","inputSchema":{"type":"object","properties":{}}}]}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":2}}}
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Лекция 2: Agent anatomy and MCP - Tools, the handshake, how the model picks a tool"}],"isError":false}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"Такава лекция няма"}],"isError":true}
```

## The description experiment
- **Добро описание** („Намира лекция от курса по нейния номер и връща заглавието и темите ѝ. Използвай, когато потребителят пита за конкретна лекция.“): на въпроса „Каква е темата на лекция 3?“ Gemini CLI (gemini-3-flash-preview) избра `find_lecture` с `number: 3` и върна правилния отговор.
- **Лошо описание** („работа с лекции и неща за курса“): след рестарт на Gemini и същия въпрос той отново избра `find_lecture` с `number: 3`, без видима разлика в отговора.
- **Извод:** за толкова прост въпрос описанието не промени избора, защото името `find_lecture` и схемата с полето `number` вече подсказват какво прави инструментът. Описанието би имало по-голяма роля при много инструменти със сходно предназначение или при по-неясни въпроси.
