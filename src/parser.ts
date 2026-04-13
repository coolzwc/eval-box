import { Token, TokenType } from './token';
import { ASTNode } from './ast';
import { Tokenizer } from './tokenizer';
import { ParseError, LimitError } from './errors';

/**
 * Operator precedence (lower number = lower precedence = binds looser).
 * Matches standard JS precedence ordering.
 */
const PRECEDENCE: Record<string, number> = {
  '??': 1,
  '||': 2,
  '&&': 3,
  'in': 4,
  '==': 5, '!=': 5, '===': 5, '!==': 5,
  '>': 6, '<': 6, '>=': 6, '<=': 6,
  '+': 7, '-': 7,
  '*': 8, '/': 8, '%': 8,
  '**': 9,
};

const RIGHT_ASSOC = new Set(['**']);

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private depth: number = 0;
  private maxDepth: number;
  private maxTokens: number;
  private allowMemberAccess: boolean;
  private enabledOperators: Set<string> | null;

  constructor(options: {
    maxDepth?: number;
    maxTokens?: number;
    allowMemberAccess?: boolean;
    enabledOperators?: Set<string> | null;
    /** @internal used to share depth budget across template sub-parsers */
    _initialDepth?: number;
  } = {}) {
    this.maxDepth = options.maxDepth ?? 50;
    this.maxTokens = options.maxTokens ?? 500;
    this.allowMemberAccess = options.allowMemberAccess ?? false;
    this.enabledOperators = options.enabledOperators ?? null;
    this.depth = options._initialDepth ?? 0;
  }

  private baseDepth: number = 0;

  parse(input: string): ASTNode {
    const tokenizer = new Tokenizer(input, this.maxTokens);
    this.tokens = tokenizer.tokenize();
    this.pos = 0;
    this.baseDepth = this.depth;

    const node = this.parseExpression();
    this.expect(TokenType.EOF);
    return node;
  }

  private pushDepth(): void {
    this.depth++;
    if (this.depth > this.maxDepth) {
      throw new LimitError(`Expression depth exceeds limit of ${this.maxDepth}`);
    }
  }

  private popDepth(): void {
    this.depth--;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private peek(offset: number = 0): Token {
    return this.tokens[this.pos + offset] ?? this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: TokenType): Token {
    const t = this.current();
    if (t.type !== type) {
      throw new ParseError(
        `Expected ${type} but got ${t.type} (${JSON.stringify(t.raw)})`,
        t.position
      );
    }
    return this.advance();
  }

  private isOperatorEnabled(op: string): boolean {
    if (this.enabledOperators === null) return true;
    return this.enabledOperators.has(op);
  }

  // --- Recursive descent ---

  private parseExpression(): ASTNode {
    return this.parseTernary();
  }

  private parseTernary(): ASTNode {
    this.pushDepth();
    let node = this.parseBinary(0);

    if (this.current().type === TokenType.Question) {
      this.advance(); // skip ?
      const consequent = this.parseExpression();
      this.expect(TokenType.Colon);
      const alternate = this.parseExpression();
      node = { type: 'ConditionalExpression', test: node, consequent, alternate };
    }

    this.popDepth();
    return node;
  }

  private parseBinary(minPrec: number): ASTNode {
    let left = this.parseUnary();

    while (true) {
      const t = this.current();
      if (t.type !== TokenType.Operator) break;

      const op = t.value as string;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrec) break;

      if (!this.isOperatorEnabled(op)) {
        throw new ParseError(`Operator '${op}' is disabled`, t.position);
      }

      this.advance();
      const nextMin = RIGHT_ASSOC.has(op) ? prec : prec + 1;
      const right = this.parseBinary(nextMin);
      left = { type: 'BinaryExpression', operator: op, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    const t = this.current();

    if (t.type === TokenType.UnaryOperator) {
      this.advance();
      const op = t.value as string;
      this.pushDepth();
      const operand = this.parseUnary();
      this.popDepth();
      return { type: 'UnaryExpression', operator: op, operand };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let node = this.parsePrimary();

    while (true) {
      const t = this.current();

      if (t.type === TokenType.Dot) {
        if (!this.allowMemberAccess) {
          throw new ParseError('Member access is disabled', t.position);
        }
        this.advance();
        const prop = this.expect(TokenType.Identifier);
        node = { type: 'MemberExpression', object: node, property: prop.value as string };
        continue;
      }

      if (t.type === TokenType.OptionalChain) {
        if (!this.allowMemberAccess) {
          throw new ParseError('Member access is disabled', t.position);
        }
        this.advance();
        const prop = this.expect(TokenType.Identifier);
        node = { type: 'OptionalMemberExpression', object: node, property: prop.value as string };
        continue;
      }

      if (t.type === TokenType.OpenBracket) {
        if (!this.allowMemberAccess) {
          throw new ParseError('Member access is disabled', t.position);
        }
        this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.CloseBracket);
        node = { type: 'IndexExpression', object: node, index };
        continue;
      }

      break;
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    const t = this.current();

    switch (t.type) {
      case TokenType.Number:
        this.advance();
        return { type: 'NumberLiteral', value: t.value as number };

      case TokenType.String:
        this.advance();
        return { type: 'StringLiteral', value: t.value as string };

      case TokenType.Template:
        this.advance();
        return this.parseTemplateParts(t.value as string);

      case TokenType.Boolean:
        this.advance();
        return { type: 'BooleanLiteral', value: t.value as boolean };

      case TokenType.Null:
        this.advance();
        return { type: 'NullLiteral' };

      case TokenType.Undefined:
        this.advance();
        return { type: 'UndefinedLiteral' };

      case TokenType.Identifier: {
        const name = t.value as string;
        // Check if it's a function call
        if (this.peek(1).type === TokenType.OpenParen) {
          return this.parseCall();
        }
        this.advance();
        return { type: 'Identifier', name };
      }

      case TokenType.OpenParen: {
        this.advance();
        this.pushDepth();
        const expr = this.parseExpression();
        this.popDepth();
        this.expect(TokenType.CloseParen);
        return expr;
      }

      case TokenType.OpenBracket:
        return this.parseArray();

      default:
        throw new ParseError(
          `Unexpected token ${t.type} (${JSON.stringify(t.raw)})`,
          t.position
        );
    }
  }

  private parseCall(): ASTNode {
    const nameToken = this.advance();
    const callee = nameToken.value as string;
    this.expect(TokenType.OpenParen);

    const args: ASTNode[] = [];
    if (this.current().type !== TokenType.CloseParen) {
      args.push(this.parseExpression());
      while (this.current().type === TokenType.Comma) {
        this.advance();
        args.push(this.parseExpression());
      }
    }

    this.expect(TokenType.CloseParen);
    return { type: 'CallExpression', callee, args };
  }

  private parseArray(): ASTNode {
    this.advance(); // skip [
    const elements: ASTNode[] = [];

    if (this.current().type !== TokenType.CloseBracket) {
      elements.push(this.parseExpression());
      while (this.current().type === TokenType.Comma) {
        this.advance();
        elements.push(this.parseExpression());
      }
    }

    this.expect(TokenType.CloseBracket);
    return { type: 'ArrayExpression', elements };
  }

  private parseTemplateParts(raw: string): ASTNode {
    const inner = raw.slice(1, -1); // strip backticks
    const parts: (string | ASTNode)[] = [];
    let current = '';
    let i = 0;

    while (i < inner.length) {
      if (inner[i] === '\\' && i + 1 < inner.length) {
        const esc = inner[i + 1];
        switch (esc) {
          case 'n': current += '\n'; break;
          case 't': current += '\t'; break;
          case 'r': current += '\r'; break;
          case '\\': current += '\\'; break;
          case '`': current += '`'; break;
          case '$': current += '$'; break;
          default: current += esc;
        }
        i += 2;
        continue;
      }

      if (inner[i] === '$' && i + 1 < inner.length && inner[i + 1] === '{') {
        if (current) {
          parts.push(current);
          current = '';
        }
        i += 2;
        let depth = 1;
        let exprStr = '';
        while (i < inner.length && depth > 0) {
          if (inner[i] === '{') depth++;
          else if (inner[i] === '}') {
            depth--;
            if (depth === 0) break;
          }
          exprStr += inner[i];
          i++;
        }
        i++; // skip closing }

        this.pushDepth();
        const subParser = new Parser({
          maxDepth: this.maxDepth,
          maxTokens: this.maxTokens,
          allowMemberAccess: this.allowMemberAccess,
          enabledOperators: this.enabledOperators,
          _initialDepth: this.depth,
        });
        parts.push(subParser.parse(exprStr));
        this.popDepth();
        continue;
      }

      current += inner[i];
      i++;
    }

    if (current) {
      parts.push(current);
    }

    if (parts.length === 1 && typeof parts[0] === 'string') {
      return { type: 'StringLiteral', value: parts[0] };
    }

    return { type: 'TemplateLiteral', parts };
  }
}
