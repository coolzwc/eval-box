import { Token, TokenType } from './token';
import { ParseError, LimitError } from './errors';

const OPERATOR_CHARS = new Set([
  '+', '-', '*', '/', '%', '>', '<', '=', '!', '&', '|', '?', ':',
]);

const MULTI_CHAR_OPS = new Set([
  '**', '==', '!=', '===', '!==', '>=', '<=', '&&', '||', '??', '?.',
]);

const WORD_OPERATORS = new Map<string, string>([
  ['and', '&&'],
  ['or', '||'],
  ['not', '!'],
  ['in', 'in'],
]);

const KEYWORDS = new Map<string, { type: TokenType; value: any }>([
  ['true',      { type: TokenType.Boolean, value: true }],
  ['false',     { type: TokenType.Boolean, value: false }],
  ['null',      { type: TokenType.Null, value: null }],
  ['undefined', { type: TokenType.Undefined, value: undefined }],
]);

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') ||
         (ch >= 'A' && ch <= 'Z') ||
         ch === '_' || ch === '$';
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

export class Tokenizer {
  private input: string;
  private pos: number = 0;
  private maxTokens: number;

  constructor(input: string, maxTokens: number = 500) {
    this.input = input;
    this.maxTokens = maxTokens;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length) break;

      if (tokens.length >= this.maxTokens) {
        throw new LimitError(`Token count exceeds limit of ${this.maxTokens}`);
      }

      const token = this.readNextToken(tokens);
      tokens.push(token);
    }

    tokens.push({ type: TokenType.EOF, value: null, raw: '', position: this.pos });
    return tokens;
  }

  private readNextToken(preceding: Token[]): Token {
    const ch = this.input[this.pos];

    if (isDigit(ch) || (ch === '.' && this.pos + 1 < this.input.length && isDigit(this.input[this.pos + 1]))) {
      return this.readNumber();
    }

    if (ch === '.') {
      return this.makeSingle(TokenType.Dot, '.');
    }

    if (ch === '\'' || ch === '"') {
      return this.readString(ch);
    }

    if (ch === '`') {
      return this.readTemplate();
    }

    if (isIdentStart(ch)) {
      return this.readIdentifier(preceding);
    }

    if (ch === '(') {
      return this.makeSingle(TokenType.OpenParen, '(');
    }
    if (ch === ')') {
      return this.makeSingle(TokenType.CloseParen, ')');
    }
    if (ch === '[') {
      return this.makeSingle(TokenType.OpenBracket, '[');
    }
    if (ch === ']') {
      return this.makeSingle(TokenType.CloseBracket, ']');
    }
    if (ch === ',') {
      return this.makeSingle(TokenType.Comma, ',');
    }

    if (OPERATOR_CHARS.has(ch)) {
      return this.readOperator(preceding);
    }

    throw new ParseError(`Unexpected character '${ch}'`, this.pos);
  }

  private makeSingle(type: TokenType, raw: string): Token {
    const pos = this.pos;
    this.pos++;
    return { type, value: raw, raw, position: pos };
  }

  private readNumber(): Token {
    const start = this.pos;
    let value: number;

    if (this.input[this.pos] === '0' && this.pos + 1 < this.input.length) {
      const next = this.input[this.pos + 1];
      if (next === 'x' || next === 'X') {
        this.pos += 2;
        const hexStart = this.pos;
        while (this.pos < this.input.length && /[0-9a-fA-F]/.test(this.input[this.pos])) {
          this.pos++;
        }
        if (this.pos === hexStart) throw new ParseError('Invalid hex literal', start);
        value = parseInt(this.input.slice(hexStart, this.pos), 16);
        return { type: TokenType.Number, value, raw: this.input.slice(start, this.pos), position: start };
      }
      if (next === 'b' || next === 'B') {
        this.pos += 2;
        const binStart = this.pos;
        while (this.pos < this.input.length && (this.input[this.pos] === '0' || this.input[this.pos] === '1')) {
          this.pos++;
        }
        if (this.pos === binStart) throw new ParseError('Invalid binary literal', start);
        value = parseInt(this.input.slice(binStart, this.pos), 2);
        return { type: TokenType.Number, value, raw: this.input.slice(start, this.pos), position: start };
      }
      if (next === 'o' || next === 'O') {
        this.pos += 2;
        const octStart = this.pos;
        while (this.pos < this.input.length && this.input[this.pos] >= '0' && this.input[this.pos] <= '7') {
          this.pos++;
        }
        if (this.pos === octStart) throw new ParseError('Invalid octal literal', start);
        value = parseInt(this.input.slice(octStart, this.pos), 8);
        return { type: TokenType.Number, value, raw: this.input.slice(start, this.pos), position: start };
      }
    }

    while (this.pos < this.input.length && isDigit(this.input[this.pos])) {
      this.pos++;
    }

    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      this.pos++;
      while (this.pos < this.input.length && isDigit(this.input[this.pos])) {
        this.pos++;
      }
    }

    if (this.pos < this.input.length && (this.input[this.pos] === 'e' || this.input[this.pos] === 'E')) {
      this.pos++;
      if (this.pos < this.input.length && (this.input[this.pos] === '+' || this.input[this.pos] === '-')) {
        this.pos++;
      }
      const expStart = this.pos;
      while (this.pos < this.input.length && isDigit(this.input[this.pos])) {
        this.pos++;
      }
      if (this.pos === expStart) throw new ParseError('Invalid scientific notation', start);
    }

    const raw = this.input.slice(start, this.pos);
    value = parseFloat(raw);
    return { type: TokenType.Number, value, raw, position: start };
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.pos++; // skip opening quote
    let result = '';

    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\') {
        this.pos++;
        if (this.pos >= this.input.length) throw new ParseError('Unterminated string', start);
        const esc = this.input[this.pos];
        switch (esc) {
          case 'n': result += '\n'; break;
          case 't': result += '\t'; break;
          case 'r': result += '\r'; break;
          case '\\': result += '\\'; break;
          case '\'': result += '\''; break;
          case '"': result += '"'; break;
          case '`': result += '`'; break;
          case '0': result += '\0'; break;
          case 'u': {
            this.pos++;
            if (this.pos + 4 > this.input.length) throw new ParseError('Invalid unicode escape', start);
            const hex = this.input.slice(this.pos, this.pos + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new ParseError('Invalid unicode escape', this.pos);
            result += String.fromCharCode(parseInt(hex, 16));
            this.pos += 3; // +1 below
            break;
          }
          default: result += esc;
        }
      } else {
        result += this.input[this.pos];
      }
      this.pos++;
    }

    if (this.pos >= this.input.length) throw new ParseError('Unterminated string', start);
    this.pos++; // skip closing quote
    return { type: TokenType.String, value: result, raw: this.input.slice(start, this.pos), position: start };
  }

  private readTemplate(): Token {
    const start = this.pos;
    this.pos++; // skip opening backtick
    let raw = '`';
    let depth = 0;

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === '`' && depth === 0) {
        raw += '`';
        this.pos++;
        return { type: TokenType.Template, value: raw, raw, position: start };
      }
      if (ch === '$' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '{') {
        depth++;
        raw += '${';
        this.pos += 2;
        continue;
      }
      if (ch === '}' && depth > 0) {
        depth--;
      }
      if (ch === '\\') {
        raw += ch;
        this.pos++;
        if (this.pos < this.input.length) {
          raw += this.input[this.pos];
          this.pos++;
        }
        continue;
      }
      raw += ch;
      this.pos++;
    }

    throw new ParseError('Unterminated template literal', start);
  }

  private readIdentifier(preceding: Token[]): Token {
    const start = this.pos;
    while (this.pos < this.input.length && isIdentPart(this.input[this.pos])) {
      this.pos++;
    }
    const word = this.input.slice(start, this.pos);

    const kw = KEYWORDS.get(word);
    if (kw) {
      return { type: kw.type, value: kw.value, raw: word, position: start };
    }

    const mapped = WORD_OPERATORS.get(word);
    if (mapped) {
      if (mapped === '!') {
        return { type: TokenType.UnaryOperator, value: mapped, raw: word, position: start };
      }
      if (mapped === 'in') {
        return { type: TokenType.Operator, value: 'in', raw: word, position: start };
      }
      return { type: TokenType.Operator, value: mapped, raw: word, position: start };
    }

    return { type: TokenType.Identifier, value: word, raw: word, position: start };
  }

  private readOperator(preceding: Token[]): Token {
    const start = this.pos;
    const ch = this.input[this.pos];

    // ?. (optional chaining) vs ? (ternary) vs ?? (nullish)
    if (ch === '?') {
      if (this.pos + 1 < this.input.length) {
        if (this.input[this.pos + 1] === '.') {
          // ?. but not ?.digit (that would be ternary + number)
          if (this.pos + 2 >= this.input.length || !isDigit(this.input[this.pos + 2])) {
            this.pos += 2;
            return { type: TokenType.OptionalChain, value: '?.', raw: '?.', position: start };
          }
        }
        if (this.input[this.pos + 1] === '?') {
          this.pos += 2;
          return { type: TokenType.Operator, value: '??', raw: '??', position: start };
        }
      }
      this.pos++;
      return { type: TokenType.Question, value: '?', raw: '?', position: start };
    }

    if (ch === ':') {
      this.pos++;
      return { type: TokenType.Colon, value: ':', raw: ':', position: start };
    }

    if (ch === '.') {
      this.pos++;
      return { type: TokenType.Dot, value: '.', raw: '.', position: start };
    }

    // Check for unary +/- : at start, after operator, after open paren/bracket/comma
    if (ch === '+' || ch === '-') {
      const isUnary = this.isUnaryPosition(preceding);
      if (isUnary && ch === '-') {
        this.pos++;
        return { type: TokenType.UnaryOperator, value: 'NEG', raw: '-', position: start };
      }
      if (isUnary && ch === '+') {
        this.pos++;
        return { type: TokenType.UnaryOperator, value: 'POS', raw: '+', position: start };
      }
    }

    if (ch === '!') {
      // !== or !=
      if (this.pos + 2 < this.input.length && this.input[this.pos + 1] === '=' && this.input[this.pos + 2] === '=') {
        this.pos += 3;
        return { type: TokenType.Operator, value: '!==', raw: '!==', position: start };
      }
      if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === '=') {
        this.pos += 2;
        return { type: TokenType.Operator, value: '!=', raw: '!=', position: start };
      }
      this.pos++;
      return { type: TokenType.UnaryOperator, value: '!', raw: '!', position: start };
    }

    // Try 3-char ops first, then 2-char, then 1-char
    if (this.pos + 2 < this.input.length) {
      const three = this.input.slice(this.pos, this.pos + 3);
      if (three === '===' || three === '!==') {
        this.pos += 3;
        return { type: TokenType.Operator, value: three, raw: three, position: start };
      }
    }

    if (this.pos + 1 < this.input.length) {
      const two = this.input.slice(this.pos, this.pos + 2);
      if (MULTI_CHAR_OPS.has(two)) {
        this.pos += 2;
        return { type: TokenType.Operator, value: two, raw: two, position: start };
      }
    }

    this.pos++;
    return { type: TokenType.Operator, value: ch, raw: ch, position: start };
  }

  private isUnaryPosition(preceding: Token[]): boolean {
    if (preceding.length === 0) return true;
    const last = preceding[preceding.length - 1];
    return last.type === TokenType.Operator ||
           last.type === TokenType.UnaryOperator ||
           last.type === TokenType.OpenParen ||
           last.type === TokenType.OpenBracket ||
           last.type === TokenType.Comma ||
           last.type === TokenType.Question ||
           last.type === TokenType.Colon;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.input.length) {
      if (isWhitespace(this.input[this.pos])) {
        this.pos++;
        continue;
      }
      // Single-line comment
      if (this.input[this.pos] === '/' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '/') {
        this.pos += 2;
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
        continue;
      }
      // Multi-line comment
      if (this.input[this.pos] === '/' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '*') {
        const commentStart = this.pos;
        this.pos += 2;
        while (this.pos + 1 < this.input.length && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
          this.pos++;
        }
        if (this.pos + 1 >= this.input.length) {
          throw new ParseError('Unterminated block comment', commentStart);
        }
        this.pos += 2; // skip */
        continue;
      }
      break;
    }
  }
}
