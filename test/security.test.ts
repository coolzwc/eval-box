import { describe, it, expect } from 'vitest';
import { EvalBox, SecurityError, LimitError, TimeoutError } from '../src/index';
import { safePropertyGet, TimeoutGuard } from '../src/safety';

describe('Security', () => {
  const box = new EvalBox();

  describe('prototype chain blocking', () => {
    const memberBox = new EvalBox({ allowMemberAccess: true });

    it('blocks __proto__ access', () => {
      expect(() => memberBox.evaluate('obj.__proto__', { obj: {} }))
        .toThrow(SecurityError);
    });

    it('blocks prototype access', () => {
      expect(() => memberBox.evaluate('obj.prototype', { obj: {} }))
        .toThrow(SecurityError);
    });

    it('blocks constructor access', () => {
      expect(() => memberBox.evaluate('obj.constructor', { obj: {} }))
        .toThrow(SecurityError);
    });

    it('blocks __defineGetter__ access', () => {
      expect(() => memberBox.evaluate('obj.__defineGetter__', { obj: {} }))
        .toThrow(SecurityError);
    });

    it('blocks bracket notation prototype access', () => {
      expect(() => memberBox.evaluate('obj["__proto__"]', { obj: {} }))
        .toThrow(SecurityError);
    });

    it('blocks bracket notation constructor access', () => {
      expect(() => memberBox.evaluate('obj["constructor"]', { obj: {} }))
        .toThrow(SecurityError);
    });
  });

  describe('dangerous identifier blocking', () => {
    it('blocks eval', () => {
      expect(() => box.evaluate('eval')).toThrow(SecurityError);
    });

    it('blocks Function', () => {
      expect(() => box.evaluate('Function')).toThrow(SecurityError);
    });

    it('blocks require', () => {
      expect(() => box.evaluate('require')).toThrow(SecurityError);
    });

    it('blocks globalThis', () => {
      expect(() => box.evaluate('globalThis')).toThrow(SecurityError);
    });

    it('blocks process', () => {
      expect(() => box.evaluate('process')).toThrow(SecurityError);
    });

    it('blocks window', () => {
      expect(() => box.evaluate('window')).toThrow(SecurityError);
    });
  });

  describe('member access control', () => {
    it('disabled by default', () => {
      expect(() => box.evaluate('obj.prop', { obj: { prop: 1 } }))
        .toThrow('Member access is disabled');
    });

    it('enabled via option', () => {
      const memberBox = new EvalBox({ allowMemberAccess: true });
      expect(memberBox.evaluate('obj.prop', { obj: { prop: 42 } })).toBe(42);
    });
  });

  describe('expression limits', () => {
    it('rejects expressions exceeding max length', () => {
      const shortBox = new EvalBox({ maxExpressionLength: 10 });
      expect(() => shortBox.evaluate('1 + 2 + 3 + 4 + 5')).toThrow(LimitError);
    });

    it('rejects expressions with too many tokens', () => {
      const limitBox = new EvalBox({ maxTokens: 5 });
      expect(() => limitBox.evaluate('1 + 2 + 3 + 4')).toThrow(LimitError);
    });

    it('rejects deeply nested expressions', () => {
      const shallowBox = new EvalBox({ maxDepth: 3 });
      expect(() => shallowBox.evaluate('((((1))))')).toThrow(LimitError);
    });
  });

  describe('function call restrictions', () => {
    it('rejects unknown functions', () => {
      expect(() => box.evaluate('evil()')).toThrow('Unknown function');
    });

    it('does not allow arbitrary function invocation via context', () => {
      expect(() => box.evaluate('fn()', { fn: () => 'hacked' }))
        .toThrow('Unknown function');
    });
  });

  describe('input validation', () => {
    it('rejects non-string input', () => {
      expect(() => box.evaluate(42 as any)).toThrow(TypeError);
    });

    it('rejects unknown characters', () => {
      expect(() => box.evaluate('1 @ 2')).toThrow();
    });
  });

  describe('safePropertyGet utility', () => {
    it('returns property value for safe properties', () => {
      expect(safePropertyGet({ a: 1 }, 'a')).toBe(1);
    });

    it('returns undefined for null/undefined objects', () => {
      expect(safePropertyGet(null, 'a')).toBeUndefined();
      expect(safePropertyGet(undefined, 'a')).toBeUndefined();
    });

    it('throws for blocked properties', () => {
      expect(() => safePropertyGet({}, '__proto__')).toThrow(SecurityError);
    });
  });

  describe('TimeoutGuard', () => {
    it('does not throw before timeout', () => {
      const guard = new TimeoutGuard(5000);
      expect(() => {
        for (let i = 0; i < 200; i++) guard.check();
      }).not.toThrow();
    });

    it('throws TimeoutError after timeout', () => {
      const guard = new TimeoutGuard(-1);
      expect(() => {
        for (let i = 0; i < 101; i++) guard.check();
      }).toThrow(TimeoutError);
    });
  });

  describe('TimeoutError', () => {
    it('has correct message and name', () => {
      const err = new TimeoutError(500);
      expect(err.name).toBe('TimeoutError');
      expect(err.message).toContain('500ms');
    });
  });

  describe('member access via evaluator error paths', () => {
    const memberBox = new EvalBox({ allowMemberAccess: true });

    it('throws on null member access (non-optional)', () => {
      expect(() => memberBox.evaluate('x.y', { x: null }))
        .toThrow("Cannot read property 'y' of null");
    });

    it('throws on null index access', () => {
      expect(() => memberBox.evaluate('x[0]', { x: null }))
        .toThrow('Cannot read index of null');
    });

    it('blocks bracket notation with computed blocked property', () => {
      expect(() => memberBox.evaluate('x[y]', { x: {}, y: 'constructor' }))
        .toThrow(SecurityError);
    });
  });

  describe('prototype chain isolation', () => {
    it('does not resolve Object.prototype properties as variables', () => {
      const box = new EvalBox();
      expect(() => box.evaluate('toString')).toThrow('Undefined variable');
      expect(() => box.evaluate('hasOwnProperty')).toThrow('Undefined variable');
      expect(() => box.evaluate('valueOf')).toThrow('Undefined variable');
    });

    it('does not resolve inherited properties from context', () => {
      const box = new EvalBox();
      const ctx = { x: 1 };
      expect(() => box.evaluate('toString', ctx)).toThrow('Undefined variable');
      expect(() => box.evaluate('constructor', ctx)).toThrow(SecurityError);
    });

    it('does not allow calling Object.prototype methods as functions', () => {
      const box = new EvalBox();
      expect(() => box.evaluate('toString()')).toThrow('Unknown function');
      expect(() => box.evaluate('hasOwnProperty("x")', { x: 1 })).toThrow('Unknown function');
    });

    it('in operator uses own-property check', () => {
      const box = new EvalBox();
      expect(box.evaluate('"toString" in obj', { obj: {} })).toBe(false);
      expect(box.evaluate('"x" in obj', { obj: { x: 1 } })).toBe(true);
    });
  });

  describe('disabled member access variants', () => {
    it('rejects optional chaining when member access disabled', () => {
      const strictBox = new EvalBox({ allowMemberAccess: false });
      expect(() => strictBox.evaluate('a?.b', { a: {} })).toThrow('Member access is disabled');
    });

    it('rejects bracket access when member access disabled', () => {
      const strictBox = new EvalBox({ allowMemberAccess: false });
      expect(() => strictBox.evaluate('a[0]', { a: [1] })).toThrow('Member access is disabled');
    });
  });

  describe('unterminated block comments', () => {
    it('throws on unterminated block comment', () => {
      const box = new EvalBox();
      expect(() => box.evaluate('/* not closed 1+1')).toThrow('Unterminated block comment');
      expect(() => box.evaluate('1 + /* open')).toThrow('Unterminated block comment');
    });
  });

  describe('template depth budget', () => {
    it('shares depth budget with template sub-parsers', () => {
      const box = new EvalBox({ maxDepth: 5 });
      expect(() => box.evaluate('`${`${`${`${`${1}`}`}`}`}`'))
        .toThrow('depth exceeds limit');
    });
  });

  describe('large array DoS protection', () => {
    it('min/max handle large arrays without stack overflow', () => {
      const box = new EvalBox();
      const bigArr = new Array(200000).fill(0);
      bigArr[100000] = -1;
      bigArr[150000] = 999;
      expect(box.evaluate('min(arr)', { arr: bigArr })).toBe(-1);
      expect(box.evaluate('max(arr)', { arr: bigArr })).toBe(999);
    });
  });

  describe('caret operator rejected', () => {
    it('throws on ^ character', () => {
      const box = new EvalBox();
      expect(() => box.evaluate('2 ^ 3')).toThrow();
    });
  });
});
