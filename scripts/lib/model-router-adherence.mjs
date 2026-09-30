/** Source-only router checks shared by the CLI and pre-push gate. */
const PATTERNS = [
  { id: 'anthropic-api-host', regex: /api\.anthropic\.com/ },
  { id: 'anthropic-sdk', regex: /@anthropic-ai\/sdk/ },
  { id: 'hardcoded-claude-model', regex: /claude-(?:[a-z]+-)*\d[A-Za-z0-9._\[\]-]*/ },
];

// Keep strings, templates and regex literals intact. Only comments disappear;
// ambiguous syntax remains visible to the guard rather than being trusted.
function tokensFor(source) {
  const token = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|^[\t ]*\#[^\r\n]*|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/(?:\\[^\r\n]|\[(?:\\[^\r\n]|[^\]\\\r\n])*\]|[^/\\[\r\n])+\/[a-z]*|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/gm;
  return [...source.matchAll(token)].map((match) => ({ value: match[0], start: match.index, end: match.index + match[0].length }));
}
function commentToken(value) { return value.startsWith('/*') || value.startsWith('//') || /^\s*#/.test(value); }
function staticExpected(tokens) {
  if (!tokens.length) return false;
  // A deliberately narrow data grammar: literal strings/numbers and containers.
  // Calls, identifiers, templates, operators and property access are never inert.
  return tokens.every(({ value }) => /^(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\d+(?:\.\d+)?|true|false|null|[\[\]{},:])$/.test(value));
}

export function inspectModelRouterSource(source, file) {
  if (!file.startsWith('scripts/') || file === 'scripts/lib/model-router.mjs' || file === 'scripts/git-hooks/pre-push') return [];
  const text = String(source);
  const tokens = tokensFor(text);
  const ignored = tokens.filter(({ value }) => commentToken(value));
  const code = tokens.filter(({ value }) => !commentToken(value));
  const testFile = /(?:^|\/)(?:__tests__|test)(?:\/|[-.])|\.(?:test|spec)\.[cm]?[jt]s$/.test(file);
  if (testFile) {
    for (let index = 0; index < code.length - 4; index += 1) {
      if (code[index].value !== 'assert' || code[index + 1].value !== '.' || !/^(?:equal|strictEqual|deepEqual|deepStrictEqual)$/.test(code[index + 2].value) || code[index + 3].value !== '(') continue;
      let depth = 0, argumentStart = index + 4;
      const argumentsList = [];
      for (let cursor = argumentStart; cursor < code.length; cursor += 1) {
        const value = code[cursor].value;
        if (value === ')' && depth === 0) {
          argumentsList.push(code.slice(argumentStart, cursor));
          break;
        }
        if (value === ',' && depth === 0) {
          argumentsList.push(code.slice(argumentStart, cursor));
          argumentStart = cursor + 1;
        } else if (['(', '[', '{'].includes(value)) depth += 1;
        else if ([')', ']', '}'].includes(value)) depth -= 1;
      }
      if (staticExpected(argumentsList[1] || [])) ignored.push(...argumentsList[1]);
    }
  }
  const characters = text.split('');
  for (const { start, end } of ignored) {
    for (let index = start; index < end; index += 1) if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
  }
  const findings = [];
  const lines = characters.join('').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const { id, regex } of PATTERNS) if (regex.test(lines[index])) findings.push({ file, line: index + 1, pattern: id });
  }
  return findings;
}
