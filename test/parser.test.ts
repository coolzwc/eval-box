import { describe, it, expect } from 'vitest';
import { Parser } from '../src/parser';

describe('Parser', () => {
  const parser = new Parser({ allowMemberAccess: true });
  const parse = (input: string) => parser.parse(input);

  describe('literals', () => {
    it('numbers', () => {
      expect(parse('42')).toEqual({ type: 'NumberLiteral', value: 42 });
      expect(parse('3.14')).toEqual({ type: 'NumberLiteral', value: 3.14 });
      expect(parse('0xFF')).toEqual({ type: 'NumberLiteral', value: 255 });
    });

    it('strings', () => {
      expect(parse("'hello'")).toEqual({ type: 'StringLiteral', value: 'hello' });
      expect(parse('"world"')).toEqual({ type: 'StringLiteral', value: 'world' });
    });

    it('booleans', () => {
      expect(parse('true')).toEqual({ type: 'BooleanLiteral', value: true });
      expect(parse('false')).toEqual({ type: 'BooleanLiteral', value: false });
    });

    it('null', () => {
      expect(parse('null')).toEqual({ type: 'NullLiteral' });
    });

    it('undefined', () => {
      expect(parse('undefined')).toEqual({ type: 'UndefinedLiteral' });
    });
  });

  describe('precedence', () => {
    it('multiplication before addition', () => {
      const ast = parse('1 + 2 * 3') as any;
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('+');
      expect(ast.left.value).toBe(1);
      expect(ast.right.operator).toBe('*');
    });

    it('parentheses override precedence', () => {
      const ast = parse('(1 + 2) * 3') as any;
      expect(ast.type).toBe('BinaryExpression');
      expect(ast.operator).toBe('*');
      expect(ast.left.operator).toBe('+');
    });

    it('** is right-associative', () => {
      const ast = parse('2 ** 3 ** 4') as any;
      expect(ast.operator).toBe('**');
      expect(ast.right.operator).toBe('**');
    });

    it('comparison before logical', () => {
      const ast = parse('a > 1 && b < 2') as any;
      expect(ast.operator).toBe('&&');
      expect(ast.left.operator).toBe('>');
      expect(ast.right.operator).toBe('<');
    });

    it('?? has lowest precedence among binary ops', () => {
      const ast = parse('a + 1 ?? b') as any;
      expect(ast.operator).toBe('??');
      expect(ast.left.operator).toBe('+');
    });
  });

  describe('unary expressions', () => {
    it('negation', () => {
      const ast = parse('-5') as any;
      expect(ast.type).toBe('UnaryExpression');
      expect(ast.operator).toBe('NEG');
      expect(ast.operand.value).toBe(5);
    });

    it('logical not', () => {
      const ast = parse('!true') as any;
      expect(ast.type).toBe('UnaryExpression');
      expect(ast.operator).toBe('!');
    });

    it('double not', () => {
      const ast = parse('!!x') as any;
      expect(ast.type).toBe('UnaryExpression');
      expect(ast.operator).toBe('!');
      expect(ast.operand.type).toBe('UnaryExpression');
    });

    it('negation in expression', () => {
      const ast = parse('3 + -2') as any;
      expect(ast.operator).toBe('+');
      expect(ast.right.type).toBe('UnaryExpression');
      expect(ast.right.operator).toBe('NEG');
    });
  });

  describe('ternary expression', () => {
    it('basic ternary', () => {
      const ast = parse('a ? b : c') as any;
      expect(ast.type).toBe('ConditionalExpression');
      expect(ast.test.name).toBe('a');
      expect(ast.consequent.name).toBe('b');
      expect(ast.alternate.name).toBe('c');
    });

    it('nested ternary', () => {
      const ast = parse('a ? b : c ? d : e') as any;
      expect(ast.type).toBe('ConditionalExpression');
      expect(ast.alternate.type).toBe('ConditionalExpression');
    });
  });

  describe('member access', () => {
    it('dot access', () => {
      const ast = parse('obj.prop') as any;
      expect(ast.type).toBe('MemberExpression');
      expect(ast.object.name).toBe('obj');
      expect(ast.property).toBe('prop');
    });

    it('chained dot access', () => {
      const ast = parse('a.b.c') as any;
      expect(ast.type).toBe('MemberExpression');
      expect(ast.object.type).toBe('MemberExpression');
    });

    it('optional chaining', () => {
      const ast = parse('obj?.prop') as any;
      expect(ast.type).toBe('OptionalMemberExpression');
    });

    it('index access', () => {
      const ast = parse('arr[0]') as any;
      expect(ast.type).toBe('IndexExpression');
      expect(ast.index.value).toBe(0);
    });

    it('member access disabled by default', () => {
      const strictParser = new Parser();
      expect(() => strictParser.parse('a.b')).toThrow('Member access is disabled');
    });
  });

  describe('function calls', () => {
    it('no arguments', () => {
      const ast = parse('random()') as any;
      expect(ast.type).toBe('CallExpression');
      expect(ast.callee).toBe('random');
      expect(ast.args).toHaveLength(0);
    });

    it('single argument', () => {
      const ast = parse('abs(-5)') as any;
      expect(ast.type).toBe('CallExpression');
      expect(ast.callee).toBe('abs');
      expect(ast.args).toHaveLength(1);
    });

    it('multiple arguments', () => {
      const ast = parse('min(1, 2, 3)') as any;
      expect(ast.type).toBe('CallExpression');
      expect(ast.args).toHaveLength(3);
    });
  });

  describe('array expressions', () => {
    it('empty array', () => {
      const ast = parse('[]') as any;
      expect(ast.type).toBe('ArrayExpression');
      expect(ast.elements).toHaveLength(0);
    });

    it('array with elements', () => {
      const ast = parse('[1, 2, 3]') as any;
      expect(ast.type).toBe('ArrayExpression');
      expect(ast.elements).toHaveLength(3);
    });
  });

  describe('template literals', () => {
    it('plain template', () => {
      const ast = parse('`hello`') as any;
      expect(ast.type).toBe('StringLiteral');
      expect(ast.value).toBe('hello');
    });

    it('template with interpolation', () => {
      const ast = parse('`hello ${name}`') as any;
      expect(ast.type).toBe('TemplateLiteral');
      expect(ast.parts).toHaveLength(2);
      expect(ast.parts[0]).toBe('hello ');
      expect(ast.parts[1].type).toBe('Identifier');
    });
  });

  describe('error handling', () => {
    it('unexpected token', () => {
      expect(() => parse('1 +')).toThrow('Unexpected token');
    });

    it('unclosed parenthesis', () => {
      expect(() => parse('(1 + 2')).toThrow();
    });

    it('max depth exceeded', () => {
      const deepParser = new Parser({ maxDepth: 3 });
      expect(() => deepParser.parse('((((1))))')).toThrow('depth exceeds limit');
    });
  });
});
