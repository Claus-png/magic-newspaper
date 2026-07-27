// Teddy Bear

function _isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function _walk(a, b, path, out) {
  if (a === b) return;
  const bothObj = (_isObj(a) || Array.isArray(a)) && (_isObj(b) || Array.isArray(b));
  if (!bothObj) { out.set.push([path.slice(), b]); return; }

  const isArr = Array.isArray(b);
  const keysA = a ? Object.keys(a) : [];
  const keysB = b ? Object.keys(b) : [];
  const allKeys = isArr
    ? Array.from({ length: Math.max(a?.length || 0, b?.length || 0) }, (_, i) => String(i))
    : Array.from(new Set([...keysA, ...keysB]));

  for (const k of allKeys) {
    const av = a ? a[k] : undefined;
    const bv = b ? b[k] : undefined;
    if (bv === undefined && av !== undefined) { out.del.push([...path, k]); continue; }
    if (av === undefined && bv !== undefined) { out.set.push([[...path, k], bv]); continue; }
    _walk(av, bv, [...path, k], out);
  }
  if (isArr && (a?.length || 0) !== (b?.length || 0)) {
    out.set.push([[...path, 'length'], b.length]);
  }
}

export function diffSnapshots(from, to) {
  const out = { set: [], del: [] };
  _walk(from, to, [], out);
  return out;
}

function _clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

export function applyDelta(base, delta) {
  const result = _clone(base);
  for (const path of delta.del) _setAt(result, path, undefined, true);
  for (const [path, value] of delta.set) _setAt(result, path, _clone(value), false);
  return result;
}

function _setAt(root, path, value, isDelete) {
  if (path.length === 0) return;
  let node = root;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (node[key] === undefined) node[key] = /^\d+$/.test(path[i + 1]) ? [] : {};
    node = node[key];
  }
  const last = path[path.length - 1];
  if (isDelete) {
    if (Array.isArray(node)) node.splice(Number(last), 1);
    else delete node[last];
  } else {
    node[last] = value;
  }
}

export class DiffHistory {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.reset();
  }
  reset(initial = null) {
    this._base = initial ? _clone(initial) : null;
    this._deltas = [];
    this._idx = initial ? 0 : -1;
  }
  get length() { return this._base ? this._deltas.length + 1 : 0; }
  get index() { return this._idx; }

  push(state) {
    if (!this._base) { this._base = _clone(state); this._deltas = []; this._idx = 0; return; }
    const current = this.current();
    this._deltas = this._deltas.slice(0, this._idx);
    this._deltas.push(diffSnapshots(current, state));
    this._idx++;
    if (this._deltas.length > this.maxSize) {
      this._base = applyDelta(this._base, this._deltas.shift());
      this._idx--;
    }
  }

  current() {
    if (!this._base) return null;
    let state = this._base;
    for (let i = 0; i < this._idx; i++) state = applyDelta(state, this._deltas[i]);
    return state;
  }

  canUndo() { return this._idx > 0; }
  canRedo() { return this._idx < this._deltas.length; }

  undo() { if (this.canUndo()) this._idx--; return this.current(); }
  redo() { if (this.canRedo()) this._idx++; return this.current(); }
}
