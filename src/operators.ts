export type UnaryOperatorFn = (a: any) => any;
export type BinaryOperatorFn = (a: any, b: any) => any;

export const defaultUnaryOperators: Record<string, UnaryOperatorFn> = {
  NEG: (a) => -a,
  POS: (a) => +a,
  '!': (a) => !a,
};

export const defaultBinaryOperators: Record<string, BinaryOperatorFn> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '%': (a, b) => a % b,
  '**': (a, b) => a ** b,
  '==': (a, b) => a == b,
  '!=': (a, b) => a != b,
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '&&': (a, b) => a && b,
  '||': (a, b) => a || b,
  '??': (a, b) => a ?? b,
  'in': (a, b) => {
    if (Array.isArray(b)) return b.includes(a);
    if (b && typeof b === 'object') return Object.prototype.hasOwnProperty.call(b, a);
    return false;
  },
};
