import { describe, it, expect } from 'vitest';
import { EvalBox } from '../src/index';

describe('Operators', () => {
  const box = new EvalBox({ allowMemberAccess: true });
  const ev = (expr: string, ctx?: Record<string, any>) => box.evaluate(expr, ctx);

  describe('arithmetic', () => {
    it('addition', () => {
      expect(ev('1 + 2')).toBe(3);
      expect(ev('0.1 + 0.2')).toBeCloseTo(0.3);
    });

    it('subtraction', () => {
      expect(ev('10 - 3')).toBe(7);
      expect(ev('0 - 5')).toBe(-5);
    });

    it('multiplication', () => {
      expect(ev('3 * 4')).toBe(12);
      expect(ev('0 * 100')).toBe(0);
    });

    it('division', () => {
      expect(ev('10 / 2')).toBe(5);
      expect(ev('1 / 3')).toBeCloseTo(0.3333);
      expect(ev('1 / 0')).toBe(Infinity);
    });

    it('modulo', () => {
      expect(ev('10 % 3')).toBe(1);
      expect(ev('4 % 2')).toBe(0);
      expect(ev('-6 % 5')).toBe(-1);
    });

    it('exponentiation', () => {
      expect(ev('2 ** 3')).toBe(8);
      expect(ev('2 ** 0')).toBe(1);
      expect(ev('2 ** -1')).toBe(0.5);
    });

    it('precedence', () => {
      expect(ev('1 + 2 * 3')).toBe(7);
      expect(ev('(1 + 2) * 3')).toBe(9);
      expect(ev('2 ** 3 ** 2')).toBe(512); // right-assoc: 2^(3^2) = 2^9
      expect(ev('12 - 2 * -2')).toBe(16);
    });
  });

  describe('comparison', () => {
    it('==', () => {
      expect(ev('2 == 2')).toBe(true);
      expect(ev('2 == 3')).toBe(false);
    });

    it('!=', () => {
      expect(ev('2 != 3')).toBe(true);
      expect(ev('2 != 2')).toBe(false);
    });

    it('===', () => {
      expect(ev('3 === 3')).toBe(true);
      expect(ev('3 === 3')).toBe(true);
    });

    it('!==', () => {
      expect(ev('3 !== 4')).toBe(true);
      expect(ev('3 !== 3')).toBe(false);
    });

    it('> < >= <=', () => {
      expect(ev('3 > 2')).toBe(true);
      expect(ev('2 < 3')).toBe(true);
      expect(ev('3 >= 3')).toBe(true);
      expect(ev('3 <= 3')).toBe(true);
      expect(ev('2 >= 3')).toBe(false);
      expect(ev('4 <= 3')).toBe(false);
    });
  });

  describe('logical', () => {
    it('&&', () => {
      expect(ev('true && true')).toBe(true);
      expect(ev('true && false')).toBe(false);
      expect(ev('false && true')).toBe(false);
    });

    it('||', () => {
      expect(ev('true || false')).toBe(true);
      expect(ev('false || true')).toBe(true);
      expect(ev('false || false')).toBe(false);
    });

    it('!', () => {
      expect(ev('!true')).toBe(false);
      expect(ev('!false')).toBe(true);
      expect(ev('!!true')).toBe(true);
    });

    it('short-circuit &&', () => {
      // If LHS is false, RHS should not be evaluated (no error)
      expect(ev('false && x', { x: undefined })).toBe(false);
    });

    it('short-circuit ||', () => {
      expect(ev('true || x', { x: undefined })).toBe(true);
    });

    it('word operators: and / or / not', () => {
      expect(ev('true and false')).toBe(false);
      expect(ev('true or false')).toBe(true);
      expect(ev('not true')).toBe(false);
    });
  });

  describe('nullish coalescing ??', () => {
    it('returns left when not null/undefined', () => {
      expect(ev('a ?? 10', { a: 5 })).toBe(5);
      expect(ev('a ?? 10', { a: 0 })).toBe(0);
      expect(ev('a ?? 10', { a: false })).toBe(false);
      expect(ev('a ?? 10', { a: '' })).toBe('');
    });

    it('returns right when left is null/undefined', () => {
      expect(ev('a ?? 10', { a: null })).toBe(10);
      expect(ev('a ?? 10', { a: undefined })).toBe(10);
    });
  });

  describe('in operator', () => {
    it('array membership', () => {
      expect(ev('"a" in arr', { arr: ['a', 'b'] })).toBe(true);
      expect(ev('"c" in arr', { arr: ['a', 'b'] })).toBe(false);
      expect(ev('3 in arr', { arr: [1, 2, 3] })).toBe(true);
    });

    it('object membership', () => {
      expect(ev('"x" in obj', { obj: { x: 1 } })).toBe(true);
      expect(ev('"y" in obj', { obj: { x: 1 } })).toBe(false);
    });
  });

  describe('ternary', () => {
    it('basic ternary', () => {
      expect(ev('true ? 1 : 2')).toBe(1);
      expect(ev('false ? 1 : 2')).toBe(2);
    });

    it('nested ternary', () => {
      expect(ev('true ? false ? 3 : 4 : 5')).toBe(4);
      expect(ev('false ? 1 : true ? 2 : 3')).toBe(2);
    });

    it('lazy evaluation', () => {
      // Only the chosen branch should be evaluated
      expect(ev('true ? 42 : x', { x: undefined })).toBe(42);
      expect(ev('false ? x : 99', { x: undefined })).toBe(99);
    });

    it('with comparison', () => {
      expect(ev('a > 10 ? 1 : 0', { a: 15 })).toBe(1);
      expect(ev('a > 10 ? 1 : 0', { a: 5 })).toBe(0);
    });
  });

  describe('unary', () => {
    it('negation', () => {
      expect(ev('-5')).toBe(-5);
      expect(ev('-(-3)')).toBe(3);
      expect(ev('-(1 + 2)')).toBe(-3);
    });

    it('positive', () => {
      expect(ev('+5')).toBe(5);
    });

    it('negation in complex expressions', () => {
      expect(ev('3 + -2')).toBe(1);
      expect(ev('3 * -2')).toBe(-6);
      expect(ev('-a * 2', { a: 3 })).toBe(-6);
    });
  });

  describe('string concatenation', () => {
    it('string + string', () => {
      expect(ev("'hello' + ' ' + 'world'")).toBe('hello world');
    });

    it('string + number', () => {
      expect(ev("'count: ' + 42")).toBe('count: 42');
    });
  });

  describe('in operator edge cases', () => {
    it('returns false for non-object/non-array', () => {
      expect(ev('"a" in x', { x: 42 })).toBe(false);
      expect(ev('"a" in x', { x: 'hello' })).toBe(false);
    });
  });
});
