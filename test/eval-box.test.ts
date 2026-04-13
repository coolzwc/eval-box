import { describe, it, expect } from 'vitest';
import {
  EvalBox,
  CompiledExpression,
  EvalBoxPlugin,
  defaultFunctions,
  defaultConstants,
} from '../src/index';

describe('EvalBox Integration', () => {
  describe('static API', () => {
    it('evaluate simple expression', () => {
      expect(EvalBox.evaluate('1 + 2')).toBe(3);
    });

    it('evaluate with context', () => {
      expect(EvalBox.evaluate('a + b', { a: 10, b: 20 })).toBe(30);
    });

    it('parse returns AST', () => {
      const ast = EvalBox.parse('1 + 2');
      expect(ast.type).toBe('BinaryExpression');
    });
  });

  describe('instance API', () => {
    it('evaluate', () => {
      const box = new EvalBox();
      expect(box.evaluate('2 * 3')).toBe(6);
    });

    it('parse + evaluateAST', () => {
      const box = new EvalBox();
      const ast = box.parse('x + y');
      expect(box.evaluateAST(ast, { x: 3, y: 7 })).toBe(10);
      expect(box.evaluateAST(ast, { x: 100, y: 200 })).toBe(300);
    });

    it('compile', () => {
      const box = new EvalBox();
      const compiled = box.compile('x ** 2');
      expect(compiled.evaluate({ x: 3 })).toBe(9);
      expect(compiled.evaluate({ x: 5 })).toBe(25);
      expect(compiled.evaluate({ x: -2 })).toBe(4);
    });

    it('compiled expression returns AST', () => {
      const box = new EvalBox();
      const compiled = box.compile('1 + 2');
      expect(compiled.getAST().type).toBe('BinaryExpression');
    });
  });

  describe('context variables', () => {
    const box = new EvalBox();

    it('resolves simple variables', () => {
      expect(box.evaluate('x', { x: 42 })).toBe(42);
    });

    it('resolves boolean variables', () => {
      expect(box.evaluate('flag ? 1 : 0', { flag: true })).toBe(1);
    });

    it('resolves string variables', () => {
      expect(box.evaluate("name == 'Alice'", { name: 'Alice' })).toBe(true);
    });

    it('throws on undefined variables', () => {
      expect(() => box.evaluate('missing')).toThrow('Undefined variable');
    });

    it('complex expression with context', () => {
      const result = box.evaluate(
        'price * quantity * (1 - discount)',
        { price: 100, quantity: 3, discount: 0.1 }
      );
      expect(result).toBeCloseTo(270);
    });
  });

  describe('member access', () => {
    const box = new EvalBox({ allowMemberAccess: true });

    it('dot access', () => {
      expect(box.evaluate('user.name', { user: { name: 'Alice' } })).toBe('Alice');
    });

    it('chained dot access', () => {
      expect(box.evaluate('a.b.c', { a: { b: { c: 42 } } })).toBe(42);
    });

    it('optional chaining with value', () => {
      expect(box.evaluate('user?.name', { user: { name: 'Alice' } })).toBe('Alice');
    });

    it('optional chaining with null', () => {
      expect(box.evaluate('user?.name', { user: null })).toBeUndefined();
    });

    it('index access', () => {
      expect(box.evaluate('arr[1]', { arr: [10, 20, 30] })).toBe(20);
    });

    it('computed index', () => {
      expect(box.evaluate('arr[i]', { arr: [10, 20, 30], i: 2 })).toBe(30);
    });
  });

  describe('template literals', () => {
    const box = new EvalBox();

    it('simple template', () => {
      expect(box.evaluate('`hello world`')).toBe('hello world');
    });

    it('template with interpolation', () => {
      expect(box.evaluate('`hello ${name}`', { name: 'Alice' })).toBe('hello Alice');
    });

    it('template with expression', () => {
      expect(box.evaluate('`result: ${1 + 2}`')).toBe('result: 3');
    });

    it('template with ternary', () => {
      expect(box.evaluate('`${x > 0 ? "positive" : "negative"}`', { x: 5 }))
        .toBe('positive');
    });

    it('multiple interpolations', () => {
      expect(box.evaluate('`${a} + ${b} = ${a + b}`', { a: 1, b: 2 }))
        .toBe('1 + 2 = 3');
    });

    it('template with escape sequences', () => {
      expect(box.evaluate('`line1\\nline2`')).toBe('line1\nline2');
      expect(box.evaluate('`tab\\there`')).toBe('tab\there');
      expect(box.evaluate('`back\\\\slash`')).toBe('back\\slash');
      expect(box.evaluate('`escaped\\`backtick`')).toBe('escaped`backtick');
      expect(box.evaluate('`dollar\\${sign}`')).toBe('dollar${sign}');
      expect(box.evaluate('`carriage\\rreturn`')).toBe('carriage\rreturn');
      expect(box.evaluate('`unknown\\xescape`')).toBe('unknownxescape');
    });
  });

  describe('array literals', () => {
    const box = new EvalBox();

    it('empty array', () => {
      expect(box.evaluate('[]')).toEqual([]);
    });

    it('array with values', () => {
      expect(box.evaluate('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('array with expressions', () => {
      expect(box.evaluate('[1 + 1, 2 * 2, 3 ** 2]')).toEqual([2, 4, 9]);
    });

    it('array in function', () => {
      expect(box.evaluate('sum([1, 2, 3])')).toBe(6);
    });
  });

  describe('custom functions', () => {
    it('via constructor options', () => {
      const box = new EvalBox({
        functions: {
          double: (x: number) => x * 2,
          greet: (name: string) => `Hello, ${name}!`,
        },
      });
      expect(box.evaluate('double(21)')).toBe(42);
      expect(box.evaluate('greet("World")')).toBe('Hello, World!');
    });

    it('via addFunction', () => {
      const box = new EvalBox();
      box.addFunction('square', (x: number) => x * x);
      expect(box.evaluate('square(7)')).toBe(49);
    });

    it('addFunction is chainable', () => {
      const box = new EvalBox()
        .addFunction('double', (x: number) => x * 2)
        .addFunction('triple', (x: number) => x * 3);
      expect(box.evaluate('double(5) + triple(5)')).toBe(25);
    });

    it('override built-in function', () => {
      const box = new EvalBox({
        functions: {
          abs: (x: number) => x >= 0 ? x : -x + 1,
        },
      });
      expect(box.evaluate('abs(-5)')).toBe(6);
    });
  });

  describe('custom constants', () => {
    it('via constructor', () => {
      const box = new EvalBox({
        constants: { TAU: Math.PI * 2, GOLDEN: 1.618 },
      });
      expect(box.evaluate('TAU')).toBeCloseTo(6.2832);
      expect(box.evaluate('GOLDEN')).toBe(1.618);
    });

    it('via addConstant', () => {
      const box = new EvalBox();
      box.addConstant('MAX_SCORE', 100);
      expect(box.evaluate('score <= MAX_SCORE', { score: 85 })).toBe(true);
    });
  });

  describe('custom operators', () => {
    it('override binary operator', () => {
      const box = new EvalBox({
        binaryOperators: {
          '+': (a: any, b: any) => String(a) + String(b),
        },
      });
      expect(box.evaluate('1 + 2')).toBe('12');
    });
  });

  describe('plugin system', () => {
    it('register plugin with functions and constants', () => {
      const datePlugin: EvalBoxPlugin = {
        name: 'date',
        functions: {
          now: () => 1000,
          year: () => 2026,
        },
        constants: {
          EPOCH: 0,
        },
      };

      const box = new EvalBox({ plugins: [datePlugin] });
      expect(box.evaluate('now()')).toBe(1000);
      expect(box.evaluate('year()')).toBe(2026);
      expect(box.evaluate('EPOCH')).toBe(0);
    });

    it('register plugin via use()', () => {
      const mathExtraPlugin: EvalBoxPlugin = {
        name: 'math-extra',
        functions: {
          factorial: (n: number): number => n <= 1 ? 1 : n * (mathExtraPlugin.functions!.factorial as any)(n - 1),
          fib: (n: number): number => n <= 1 ? n : (mathExtraPlugin.functions!.fib as any)(n - 1) + (mathExtraPlugin.functions!.fib as any)(n - 2),
        },
      };

      const box = new EvalBox();
      box.use(mathExtraPlugin);
      expect(box.evaluate('factorial(5)')).toBe(120);
      expect(box.evaluate('fib(10)')).toBe(55);
    });

    it('plugin with setup hook', () => {
      let setupCalled = false;
      const plugin: EvalBoxPlugin = {
        name: 'test-setup',
        setup: (box) => {
          setupCalled = true;
          box.addFunction('setupFn', () => 'setup-works');
        },
      };

      const box = new EvalBox({ plugins: [plugin] });
      expect(setupCalled).toBe(true);
      expect(box.evaluate('setupFn()')).toBe('setup-works');
    });

    it('multiple plugins compose', () => {
      const pluginA: EvalBoxPlugin = {
        name: 'A',
        functions: { fromA: () => 'A' },
      };
      const pluginB: EvalBoxPlugin = {
        name: 'B',
        functions: { fromB: () => 'B' },
      };

      const box = new EvalBox({ plugins: [pluginA, pluginB] });
      expect(box.evaluate('concat(fromA(), fromB())')).toBe('AB');
    });

    it('use() is chainable', () => {
      const box = new EvalBox()
        .use({ name: 'p1', constants: { X: 1 } })
        .use({ name: 'p2', constants: { Y: 2 } });
      expect(box.evaluate('X + Y')).toBe(3);
    });
  });

  describe('introspection', () => {
    it('getFunctions lists all registered functions', () => {
      const box = new EvalBox();
      const fns = box.getFunctions();
      expect(fns).toContain('abs');
      expect(fns).toContain('min');
      expect(fns).toContain('max');
      expect(fns).toContain('sum');
    });

    it('getConstants returns constant values', () => {
      const box = new EvalBox();
      const consts = box.getConstants();
      expect(consts.PI).toBe(Math.PI);
      expect(consts.E).toBe(Math.E);
    });
  });

  describe('operator enable/disable', () => {
    it('disables specific operators', () => {
      const box = new EvalBox({
        operators: {
          '+': true, '-': true, '*': true, '/': true,
          '==': true, '!=': true, '===': true, '!==': true,
          '>': true, '<': true, '>=': true, '<=': true,
          '&&': true, '||': true, '??': true, 'in': true,
          '%': false, '**': false,
        },
      });

      expect(box.evaluate('1 + 2')).toBe(3);
      expect(() => box.evaluate('2 ** 3')).toThrow('disabled');
      expect(() => box.evaluate('10 % 3')).toThrow('disabled');
    });
  });

  describe('real-world expressions', () => {
    const box = new EvalBox();

    it('price calculation', () => {
      const result = box.evaluate(
        'price * qty - price * qty * discount',
        { price: 29.99, qty: 3, discount: 0.15 }
      );
      expect(result).toBeCloseTo(76.4745);
    });

    it('conditional pricing', () => {
      const expr = 'qty >= 10 ? price * qty * 0.9 : price * qty';
      expect(box.evaluate(expr, { price: 10, qty: 15 })).toBe(135);
      expect(box.evaluate(expr, { price: 10, qty: 5 })).toBe(50);
    });

    it('BMI calculation', () => {
      const result = box.evaluate(
        'round(weight / (height ** 2) * 10) / 10',
        { weight: 70, height: 1.75 }
      );
      expect(result).toBeCloseTo(22.9, 1);
    });

    it('score normalization', () => {
      const result = box.evaluate(
        'clamp((score - minScore) / (maxScore - minScore) * 100, 0, 100)',
        { score: 75, minScore: 50, maxScore: 100 }
      );
      expect(result).toBe(50);
    });

    it('complex boolean logic', () => {
      const expr = '(age >= 18 and age <= 65) and (status === "active" or role === "admin")';
      expect(box.evaluate(expr, { age: 30, status: 'active', role: 'user' })).toBe(true);
      expect(box.evaluate(expr, { age: 10, status: 'active', role: 'user' })).toBe(false);
      expect(box.evaluate(expr, { age: 30, status: 'inactive', role: 'admin' })).toBe(true);
    });

    it('nullish coalescing with defaults', () => {
      const expr = 'name ?? "Anonymous"';
      expect(box.evaluate(expr, { name: 'Alice' })).toBe('Alice');
      expect(box.evaluate(expr, { name: null })).toBe('Anonymous');
    });

    it('template literal formatting', () => {
      const result = box.evaluate(
        '`${name} scored ${score} points (${score >= 60 ? "PASS" : "FAIL"})`',
        { name: 'Alice', score: 85 }
      );
      expect(result).toBe('Alice scored 85 points (PASS)');
    });

    it('mathematical formula', () => {
      const result = box.evaluate(
        'sqrt(a ** 2 + b ** 2)',
        { a: 3, b: 4 }
      );
      expect(result).toBe(5);
    });

    it('array processing', () => {
      const result = box.evaluate(
        'sum([1, 2, 3, 4, 5]) / length([1, 2, 3, 4, 5])'
      );
      expect(result).toBe(3);
    });
  });
});
