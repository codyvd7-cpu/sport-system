// Shared test harness: load a real TS source module in-memory (transpiled with
// the project's own TypeScript, zero new deps), with its imports stubbed so the
// REAL application logic runs against mocked infrastructure. Used by the
// regression tests so they exercise actual source, not re-implementations.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);

/**
 * @param relUrl  path to the .ts file, relative to evidence/regression/
 * @param stubs   map of import specifier → module object to substitute
 */
export function loadTs(relUrl, stubs = {}) {
  const src = readFileSync(new URL(relUrl, import.meta.url), 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleObj = { exports: {} };
  const req = (id) => {
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    if (!id.startsWith('.')) return nodeRequire(id); // node builtins / installed packages
    throw new Error('unstubbed relative import in test: ' + id);
  };
  new Function('exports', 'require', 'module', js)(moduleObj.exports, req, moduleObj);
  return moduleObj.exports;
}
