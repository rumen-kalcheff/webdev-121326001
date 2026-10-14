const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin });

const fs = require('fs');
const path = require('path');

function send(obj) {
  process.stdout.write(JSON.stringify(obj)  + '\n');
}

rl.on('line', (line) => {
  if (!line.trim()) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    console.error('bad json:', line);
    return;
  }

  if (msg.method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: msg.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'lecture-server', version: '1.0.0' }
      }
    });
  } else if (msg.method === 'notifications/initialized') {
    // известие, няма отговор
  }
    else if (msg.method === 'tools/list') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        tools: [
          {
            name: 'find_lecture',
            description: 'Намира лекция от курса по нейния номер и връща заглавието и темите ѝ. Използвай, когато потребителят пита за конкретна лекция.',
            inputSchema: {
              type: 'object',
              properties: {
                number: { type: 'integer', description: 'Номерът на лекцията (цяло число, започва от 1).' }
              },
              required: ['number']
            }
          },
          {
            name: 'list_lectures',
            description: 'Връща списък с всички лекции в курса: номер и заглавие на всяка. Използвай, когато потребителят пита какви лекции има или не знае номера на лекцията.',                 // какво прави, какво връща, кога да се ползва
            inputSchema: { type: 'object', properties: {} }
          }

        ]
      }
    });
  }
  else if (msg.method === 'tools/call') {
    const name = msg.params.name;
    const args = msg.params.arguments || {};
    if (name === 'find_lecture') {
      const lectures = JSON.parse(fs.readFileSync(path.join(__dirname, 'lectures.json'), 'utf8'));
      const found = lectures.find(l => l.number === args.number);
      if(found) {
        send({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: `Лекция ${found.number}: ${found.title} - ${found.topics}` }],
            isError: false
          }
        });
      }
      else {
        send({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: `Такава лекция няма` }],
            isError: true
          }
        });
      }
    }
    else if (name === 'list_lectures') {
      const lectures = JSON.parse(fs.readFileSync(path.join(__dirname, 'lectures.json'), 'utf8'));
      const list = lectures.map(l => l.number + '. ' + l.title).join('\n');
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [{ type: 'text', text: list }],
          isError: false
        }
      });
    }
    else {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32602, message: `Unknown tool: ${name}` }
      });
    }
  }
  else if (msg.id !== undefined) {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Method not found: ${msg.method}` }
      });
    }
});