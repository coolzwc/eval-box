import { describe, it, expect } from 'vitest';
import { EvalBox } from '../src/index';

describe('Built-in Functions', () => {
  const box = new EvalBox();
  const ev = (expr: string, ctx?: Record<string, any>) => box.evaluate(expr, ctx);

  describe('math', () => {
    it('abs', () => {
      expect(ev('abs(-5)')).toBe(5);
      expect(ev('abs(5)')).toBe(5);
      expect(ev('abs(0)')).toBe(0);
    });

    it('ceil / floor / round / trunc', () => {
      expect(ev('ceil(1.2)')).toBe(2);
      expect(ev('floor(1.8)')).toBe(1);
      expect(ev('round(1.5)')).toBe(2);
      expect(ev('round(1.4)')).toBe(1);
      expect(ev('trunc(1.9)')).toBe(1);
      expect(ev('trunc(-1.9)')).toBe(-1);
    });

    it('sqrt / cbrt', () => {
      expect(ev('sqrt(16)')).toBe(4);
      expect(ev('cbrt(27)')).toBe(3);
    });

    it('pow', () => {
      expect(ev('pow(2, 10)')).toBe(1024);
    });

    it('log / log2 / log10', () => {
      expect(ev('log(E)')).toBe(1);
      expect(ev('log2(8)')).toBe(3);
      expect(ev('log10(1000)')).toBe(3);
    });

    it('sign', () => {
      expect(ev('sign(-5)')).toBe(-1);
      expect(ev('sign(0)')).toBe(0);
      expect(ev('sign(5)')).toBe(1);
    });

    it('exp / expm1 / log1p', () => {
      expect(ev('exp(0)')).toBe(1);
      expect(ev('expm1(0)')).toBe(0);
      expect(ev('log1p(0)')).toBe(0);
    });

    it('clamp', () => {
      expect(ev('clamp(5, 0, 10)')).toBe(5);
      expect(ev('clamp(-5, 0, 10)')).toBe(0);
      expect(ev('clamp(15, 0, 10)')).toBe(10);
    });
  });

  describe('trigonometry', () => {
    it('sin / cos / tan', () => {
      expect(ev('sin(0)')).toBe(0);
      expect(ev('cos(0)')).toBe(1);
      expect(ev('tan(0)')).toBe(0);
    });

    it('asin / acos / atan / atan2', () => {
      expect(ev('asin(0)')).toBe(0);
      expect(ev('acos(1)')).toBe(0);
      expect(ev('atan(0)')).toBe(0);
      expect(ev('atan2(0, 1)')).toBe(0);
    });

    it('sinh / cosh / tanh', () => {
      expect(ev('sinh(0)')).toBe(0);
      expect(ev('cosh(0)')).toBe(1);
      expect(ev('tanh(0)')).toBe(0);
    });

    it('asinh / acosh / atanh', () => {
      expect(ev('asinh(0)')).toBe(0);
      expect(ev('acosh(1)')).toBe(0);
      expect(ev('atanh(0)')).toBe(0);
    });

    it('hypot', () => {
      expect(ev('hypot(3, 4)')).toBe(5);
    });
  });

  describe('aggregation', () => {
    it('min / max', () => {
      expect(ev('min(3, 1, 2)')).toBe(1);
      expect(ev('max(3, 1, 2)')).toBe(3);
    });

    it('min / max with array', () => {
      expect(ev('min(arr)', { arr: [5, 2, 8] })).toBe(2);
      expect(ev('max(arr)', { arr: [5, 2, 8] })).toBe(8);
    });

    it('sum', () => {
      expect(ev('sum(1, 2, 3)')).toBe(6);
      expect(ev('sum(arr)', { arr: [10, 20, 30] })).toBe(60);
    });

    it('avg', () => {
      expect(ev('avg(2, 4, 6)')).toBe(4);
      expect(ev('avg(arr)', { arr: [10, 20, 30] })).toBe(20);
    });
  });

  describe('string functions', () => {
    it('length', () => {
      expect(ev('length("hello")')).toBe(5);
      expect(ev('length("")')).toBe(0);
      expect(ev('length(arr)', { arr: [1, 2, 3] })).toBe(3);
    });

    it('toLowerCase / toUpperCase', () => {
      expect(ev('toLowerCase("HELLO")')).toBe('hello');
      expect(ev('toUpperCase("hello")')).toBe('HELLO');
    });

    it('trim', () => {
      expect(ev('trim("  hello  ")')).toBe('hello');
    });

    it('startsWith / endsWith', () => {
      expect(ev('startsWith("hello", "hel")')).toBe(true);
      expect(ev('endsWith("hello", "llo")')).toBe(true);
    });

    it('includes', () => {
      expect(ev('includes("hello world", "world")')).toBe(true);
      expect(ev('includes("hello", "xyz")')).toBe(false);
    });

    it('indexOf', () => {
      expect(ev('indexOf("hello", "ll")')).toBe(2);
      expect(ev('indexOf("hello", "xyz")')).toBe(-1);
    });

    it('substring', () => {
      expect(ev('substring("hello", 1, 3)')).toBe('el');
    });

    it('replace', () => {
      expect(ev('replace("hello world", "world", "earth")')).toBe('hello earth');
    });

    it('split', () => {
      expect(ev('split("a,b,c", ",")')).toEqual(['a', 'b', 'c']);
    });

    it('concat', () => {
      expect(ev('concat("a", "b", "c")')).toBe('abc');
    });
  });

  describe('array functions', () => {
    it('join', () => {
      expect(ev('join(arr, "-")', { arr: ['a', 'b', 'c'] })).toBe('a-b-c');
    });

    it('reverse', () => {
      expect(ev('reverse(arr)', { arr: [1, 2, 3] })).toEqual([3, 2, 1]);
    });

    it('slice', () => {
      expect(ev('slice(arr, 1, 3)', { arr: [1, 2, 3, 4] })).toEqual([2, 3]);
    });

    it('flat', () => {
      expect(ev('flat(arr)', { arr: [[1, 2], [3, 4]] })).toEqual([1, 2, 3, 4]);
    });
  });

  describe('type functions', () => {
    it('Number / String / Boolean', () => {
      expect(ev('Number("42")')).toBe(42);
      expect(ev('String(42)')).toBe('42');
      expect(ev('Boolean(1)')).toBe(true);
      expect(ev('Boolean(0)')).toBe(false);
    });

    it('isNaN / isFinite', () => {
      expect(ev('isNaN(0 / 0)')).toBe(true);
      expect(ev('isNaN(42)')).toBe(false);
      expect(ev('isFinite(42)')).toBe(true);
      expect(ev('isFinite(1 / 0)')).toBe(false);
    });

    it('isArray', () => {
      expect(ev('isArray(arr)', { arr: [1, 2] })).toBe(true);
      expect(ev('isArray(x)', { x: 42 })).toBe(false);
    });
  });

  describe('function error paths', () => {
    it('join throws for non-array', () => {
      expect(() => ev('join(x, ",")', { x: 'hello' })).toThrow('join() expects an array');
    });

    it('reverse throws for non-array', () => {
      expect(() => ev('reverse(x)', { x: 42 })).toThrow('reverse() expects an array');
    });

    it('slice throws for non-array/non-string', () => {
      expect(() => ev('slice(x, 0)', { x: 42 })).toThrow('slice() expects an array or string');
    });

    it('flat throws for non-array', () => {
      expect(() => ev('flat(x)', { x: 42 })).toThrow('flat() expects an array');
    });

    it('slice works on strings', () => {
      expect(ev('slice("hello", 1, 3)')).toBe('el');
    });

    it('avg returns NaN for empty array', () => {
      expect(ev('isNaN(avg([]))')).toBe(true);
    });

    it('random returns a number', () => {
      const result = ev('random()');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it('typeof returns correct type', () => {
      expect(ev('typeof(42)', { })).toBe('number');
      expect(ev('typeof("hi")', { })).toBe('string');
      expect(ev('typeof(true)', { })).toBe('boolean');
    });

    it('includes works on arrays', () => {
      expect(ev('includes(arr, 2)', { arr: [1, 2, 3] })).toBe(true);
      expect(ev('includes(arr, 5)', { arr: [1, 2, 3] })).toBe(false);
    });

    it('indexOf works on arrays', () => {
      expect(ev('indexOf(arr, 2)', { arr: [1, 2, 3] })).toBe(1);
    });
  });

  describe('constants', () => {
    it('PI', () => {
      expect(ev('PI')).toBe(Math.PI);
    });

    it('E', () => {
      expect(ev('E')).toBe(Math.E);
    });

    it('Infinity', () => {
      expect(ev('Infinity')).toBe(Infinity);
    });

    it('NaN', () => {
      expect(ev('isNaN(NaN)')).toBe(true);
    });
  });
});
