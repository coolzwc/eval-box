import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../src/tokenizer';
import { TokenType } from '../src/token';

describe('Tokenizer', () => {
  const tokenize = (input: string) => new Tokenizer(input).tokenize();
  const types = (input: string) => tokenize(input).map(t => t.type);
  const values = (input: string) => tokenize(input).slice(0, -1).map(t => t.value);

  describe('numbers', () => {
    it('integers', () => {
      expect(values('42')).toEqual([42]);
      expect(values('0')).toEqual([0]);
    });

    it('floats', () => {
      expect(values('3.14')).toEqual([3.14]);
      expect(values('.5')).toEqual([0.5]);
      expect(values('0.1')).toEqual([0.1]);
    });

    it('scientific notation', () => {
      expect(values('1e3')).toEqual([1000]);
      expect(values('2.5e-1')).toEqual([0.25]);
      expect(values('1E+2')).toEqual([100]);
    });

    it('hex literals', () => {
      expect(values('0xFF')).toEqual([255]);
      expect(values('0x10')).toEqual([16]);
    });

    it('binary literals', () => {
      expect(values('0b1010')).toEqual([10]);
      expect(values('0B110')).toEqual([6]);
    });

    it('octal literals', () => {
      expect(values('0o17')).toEqual([15]);
      expect(values('0O10')).toEqual([8]);
    });

    it('rejects invalid hex', () => {
      expect(() => tokenize('0x')).toThrow('Invalid hex literal');
    });

    it('rejects invalid binary', () => {
      expect(() => tokenize('0b')).toThrow('Invalid binary literal');
    });

    it('rejects invalid scientific', () => {
      expect(() => tokenize('1e')).toThrow('Invalid scientific notation');
    });
  });

  describe('strings', () => {
    it('single-quoted', () => {
      expect(values("'hello'")).toEqual(['hello']);
    });

    it('double-quoted', () => {
      expect(values('"world"')).toEqual(['world']);
    });

    it('escape sequences', () => {
      expect(values("'a\\nb'")).toEqual(['a\nb']);
      expect(values("'a\\tb'")).toEqual(['a\tb']);
      expect(values("'a\\\\b'")).toEqual(['a\\b']);
      expect(values(`'a\\'b'`)).toEqual(["a'b"]);
    });

    it('unicode escapes', () => {
      expect(values("'\\u0041'")).toEqual(['A']);
    });

    it('empty strings', () => {
      expect(values("''")).toEqual(['']);
      expect(values('""')).toEqual(['']);
    });

    it('rejects unterminated strings', () => {
      expect(() => tokenize("'hello")).toThrow('Unterminated string');
    });
  });

  describe('template literals', () => {
    it('simple template', () => {
      const tokens = tokenize('`hello`');
      expect(tokens[0].type).toBe(TokenType.Template);
      expect(tokens[0].value).toBe('`hello`');
    });

    it('template with interpolation', () => {
      const tokens = tokenize('`hello ${name}`');
      expect(tokens[0].type).toBe(TokenType.Template);
    });

    it('rejects unterminated template', () => {
      expect(() => tokenize('`hello')).toThrow('Unterminated template literal');
    });
  });

  describe('identifiers and keywords', () => {
    it('identifiers', () => {
      expect(values('abc')).toEqual(['abc']);
      expect(values('_foo')).toEqual(['_foo']);
      expect(values('$bar')).toEqual(['$bar']);
      expect(values('a1b2')).toEqual(['a1b2']);
    });

    it('booleans', () => {
      const t1 = tokenize('true');
      expect(t1[0].type).toBe(TokenType.Boolean);
      expect(t1[0].value).toBe(true);

      const t2 = tokenize('false');
      expect(t2[0].type).toBe(TokenType.Boolean);
      expect(t2[0].value).toBe(false);
    });

    it('null', () => {
      const t = tokenize('null');
      expect(t[0].type).toBe(TokenType.Null);
      expect(t[0].value).toBe(null);
    });

    it('undefined', () => {
      const t = tokenize('undefined');
      expect(t[0].type).toBe(TokenType.Undefined);
    });

    it('word operators', () => {
      expect(values('a and b')).toEqual(['a', '&&', 'b']);
      expect(values('a or b')).toEqual(['a', '||', 'b']);
      expect(values('not a')).toEqual(['!', 'a']);
      expect(values('a in b')).toEqual(['a', 'in', 'b']);
    });
  });

  describe('operators', () => {
    it('arithmetic', () => {
      expect(values('1 + 2')).toEqual([1, '+', 2]);
      expect(values('3 * 4')).toEqual([3, '*', 4]);
      expect(values('5 / 6')).toEqual([5, '/', 6]);
      expect(values('7 % 8')).toEqual([7, '%', 8]);
      expect(values('2 ** 3')).toEqual([2, '**', 3]);
    });

    it('comparison', () => {
      expect(values('a == b')).toEqual(['a', '==', 'b']);
      expect(values('a != b')).toEqual(['a', '!=', 'b']);
      expect(values('a === b')).toEqual(['a', '===', 'b']);
      expect(values('a !== b')).toEqual(['a', '!==', 'b']);
      expect(values('a > b')).toEqual(['a', '>', 'b']);
      expect(values('a < b')).toEqual(['a', '<', 'b']);
      expect(values('a >= b')).toEqual(['a', '>=', 'b']);
      expect(values('a <= b')).toEqual(['a', '<=', 'b']);
    });

    it('logical', () => {
      expect(values('a && b')).toEqual(['a', '&&', 'b']);
      expect(values('a || b')).toEqual(['a', '||', 'b']);
    });

    it('nullish coalescing', () => {
      expect(values('a ?? b')).toEqual(['a', '??', 'b']);
    });

    it('unary minus at start', () => {
      const tokens = tokenize('-5');
      expect(tokens[0].type).toBe(TokenType.UnaryOperator);
      expect(tokens[0].value).toBe('NEG');
    });

    it('unary minus after operator', () => {
      const tokens = tokenize('3 + -5');
      expect(tokens[2].type).toBe(TokenType.UnaryOperator);
      expect(tokens[2].value).toBe('NEG');
    });

    it('binary minus between values', () => {
      const tokens = tokenize('3 - 5');
      expect(tokens[1].type).toBe(TokenType.Operator);
      expect(tokens[1].value).toBe('-');
    });

    it('not operator', () => {
      const tokens = tokenize('!true');
      expect(tokens[0].type).toBe(TokenType.UnaryOperator);
      expect(tokens[0].value).toBe('!');
    });

    it('optional chaining', () => {
      const tokens = tokenize('a?.b');
      expect(tokens[1].type).toBe(TokenType.OptionalChain);
    });

    it('ternary', () => {
      const tokens = tokenize('a ? b : c');
      expect(tokens[1].type).toBe(TokenType.Question);
      expect(tokens[3].type).toBe(TokenType.Colon);
    });
  });

  describe('punctuation', () => {
    it('parentheses', () => {
      expect(types('(a)')).toEqual([
        TokenType.OpenParen, TokenType.Identifier, TokenType.CloseParen, TokenType.EOF,
      ]);
    });

    it('brackets', () => {
      expect(types('[1]')).toEqual([
        TokenType.OpenBracket, TokenType.Number, TokenType.CloseBracket, TokenType.EOF,
      ]);
    });

    it('comma', () => {
      expect(types('a, b')).toEqual([
        TokenType.Identifier, TokenType.Comma, TokenType.Identifier, TokenType.EOF,
      ]);
    });
  });

  describe('comments', () => {
    it('single-line comments', () => {
      expect(values('1 + 2 // add')).toEqual([1, '+', 2]);
    });

    it('multi-line comments', () => {
      expect(values('1 /* comment */ + 2')).toEqual([1, '+', 2]);
    });
  });

  describe('whitespace', () => {
    it('ignores spaces, tabs, newlines', () => {
      expect(values('  1\t+\n2  ')).toEqual([1, '+', 2]);
    });
  });

  describe('errors', () => {
    it('rejects unknown characters', () => {
      expect(() => tokenize('1 @ 2')).toThrow('Unexpected character');
    });

    it('respects max token limit', () => {
      expect(() => new Tokenizer('1+1+1', 3).tokenize()).toThrow('Token count exceeds limit');
    });
  });
});
