// JSON parse/stringify that preserves the file's key order.
// Plain JSON.parse loses order for integer-like keys ("404" sorts first in JS
// objects), which turns a one-string edit into a noisy git diff. We escape
// digit-only keys before parsing and restore them after stringify.
const PREFIX = 'int~'; // no real key uses this shape

export function parseOrdered(text) {
  return JSON.parse(text.replace(/(?<!\\)"(\d+)"(\s*):/g, `"${PREFIX}$1"$2:`));
}

export function stringifyOrdered(obj, indent = 2) {
  return JSON.stringify(obj, null, indent).replace(/"int~(\d+)"(\s*):/g, '"$1"$2:');
}
