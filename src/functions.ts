export type SafeFunction = (...args: any[]) => any;

export const defaultFunctions: Record<string, SafeFunction> = {
  // Math
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  trunc: Math.trunc,
  sign: Math.sign,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  pow: Math.pow,
  exp: Math.exp,
  expm1: Math.expm1,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  log1p: Math.log1p,

  // Trigonometry
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  hypot: Math.hypot,

  // Aggregation
  min: (...args: any[]) => {
    const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return arr.reduce((m: number, v: any) => v < m ? v : m, arr[0] ?? Infinity);
  },
  max: (...args: any[]) => {
    const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return arr.reduce((m: number, v: any) => v > m ? v : m, arr[0] ?? -Infinity);
  },
  sum: (...args: any[]) => {
    const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return arr.reduce((acc: number, v: any) => acc + Number(v), 0);
  },
  avg: (...args: any[]) => {
    const arr = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (arr.length === 0) return NaN;
    return arr.reduce((acc: number, v: any) => acc + Number(v), 0) / arr.length;
  },
  clamp: (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi),
  random: () => Math.random(),

  // String
  length: (s: any) => {
    if (Array.isArray(s)) return s.length;
    return String(s).length;
  },
  toLowerCase: (s: string) => String(s).toLowerCase(),
  toUpperCase: (s: string) => String(s).toUpperCase(),
  trim: (s: string) => String(s).trim(),
  startsWith: (s: string, search: string) => String(s).startsWith(search),
  endsWith: (s: string, search: string) => String(s).endsWith(search),
  includes: (s: any, search: any) => {
    if (Array.isArray(s)) return s.includes(search);
    return String(s).includes(String(search));
  },
  indexOf: (s: any, search: any) => {
    if (Array.isArray(s)) return s.indexOf(search);
    return String(s).indexOf(String(search));
  },
  substring: (s: string, start: number, end?: number) =>
    String(s).substring(start, end),
  replace: (s: string, search: string, replacement: string) =>
    String(s).replace(search, replacement),
  split: (s: string, sep: string) => String(s).split(sep),
  concat: (...args: any[]) => args.join(''),

  // Array
  join: (arr: any[], sep: string = ',') => {
    if (!Array.isArray(arr)) throw new Error('join() expects an array');
    return arr.join(sep);
  },
  reverse: (arr: any[]) => {
    if (!Array.isArray(arr)) throw new Error('reverse() expects an array');
    return [...arr].reverse();
  },
  slice: (arr: any, start?: number, end?: number) => {
    if (Array.isArray(arr) || typeof arr === 'string') return arr.slice(start, end);
    throw new Error('slice() expects an array or string');
  },
  flat: (arr: any[]) => {
    if (!Array.isArray(arr)) throw new Error('flat() expects an array');
    return arr.flat();
  },

  // Type conversion
  Number: (v: any) => Number(v),
  String: (v: any) => String(v),
  Boolean: (v: any) => Boolean(v),

  // Type checking
  isNaN: (v: any) => isNaN(v),
  isFinite: (v: any) => isFinite(v),
  isArray: (v: any) => Array.isArray(v),
  typeof: (v: any) => typeof v,
};

export const defaultConstants: Record<string, any> = {
  PI: Math.PI,
  E: Math.E,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  SQRT2: Math.SQRT2,
  SQRT1_2: Math.SQRT1_2,
  Infinity: Infinity,
  NaN: NaN,
};
