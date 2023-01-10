import * as loader from "./wasm_source_map.mjs";
import * as fs from 'fs';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const removeWasm = (str) => {
  return str.replace(/wasm:\/\/wasm\/[0-9a-f]+:[a-zA-Z0-9]+:/g, '');
}
function extractLastNumber(str) {
  const regex = /\d+(?=\))/;
  const match = str.match(regex);
  return match[0];
}

function parseAndReplace(trace, resolver) {
  let lines = trace.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let match = !line.includes("wasm-function") ? undefined : line.match(/0x[0-9a-f]+/g);
    if (match) {
      match.forEach((hex) => {
        let value = parseInt(hex, 16);
        const {source, lineNo, col} = resolver.resolve(value);
        line = line.replace(hex, `${source}:${lineNo}:${col}`);
        line = removeWasm(line);
      });
      lines[i] = line;
    } else if (line.includes("wasm://wasm")) {
      const value = extractLastNumber(line);
      const {source, lineNo, col} = resolver.resolve(value);
      line = line.replace(value, `${source}:${lineNo}:${col}`);
      line = removeWasm(line);
      lines[i] = line;
    }
  }
  return lines.join('\n');
}

const filePath = process.argv[2];

if (!filePath) {
  console.error("Error: No wasm file path provided");
  process.exit(1);
}

export async function rewriteTrace(filePath, trace){
    const data = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(data);
    await loader.init(`${__dirname}/wasm_source_map.wasm`);
    const r = new loader.Resolver(uint8Array);
    
    const res = parseAndReplace(trace, r);
    console.log(res)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let trace = '';

rl.on('line', (line) => {
  trace += line + '\n';
});

rl.on('close', () => {
  rewriteTrace(filePath, trace);
});


