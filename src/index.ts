import { ASTNode } from './ast';
import { Parser } from './parser';
import { evaluate, EvaluatorContext } from './evaluator';
import { defaultUnaryOperators, defaultBinaryOperators, UnaryOperatorFn, BinaryOperatorFn } from './operators';
import { defaultFunctions, defaultConstants, SafeFunction } from './functions';
import { TimeoutGuard } from './safety';
import { LimitError } from './errors';

// ── Plugin system ──

export interface EvalBoxPlugin {
  name: string;
  functions?: Record<string, SafeFunction>;
  constants?: Record<string, any>;
  unaryOperators?: Record<string, UnaryOperatorFn>;
  binaryOperators?: Record<string, BinaryOperatorFn>;
  setup?: (box: EvalBox) => void;
}

// ── Options ──

export interface EvalBoxOptions {
  /** Enable obj.prop and obj[key] access (default: false) */
  allowMemberAccess?: boolean;

  /** Set of enabled operators. null = all enabled (default: null) */
  operators?: Record<string, boolean> | null;

  /** Custom functions to add or override built-ins */
  functions?: Record<string, SafeFunction>;

  /** Custom constants to add or override built-ins */
  constants?: Record<string, any>;

  /** Custom unary operators */
  unaryOperators?: Record<string, UnaryOperatorFn>;

  /** Custom binary operators */
  binaryOperators?: Record<string, BinaryOperatorFn>;

  /** Max input string length (default: 2000) */
  maxExpressionLength?: number;

  /** Max number of tokens (default: 500) */
  maxTokens?: number;

  /** Max AST nesting depth (default: 50) */
  maxDepth?: number;

  /** Evaluation timeout in ms (default: 1000) */
  timeout?: number;

  /** Plugins to load */
  plugins?: EvalBoxPlugin[];
}

// ── Main class ──

export class EvalBox {
  private parser: Parser;
  private functions: Record<string, SafeFunction>;
  private constants: Record<string, any>;
  private unaryOperators: Record<string, UnaryOperatorFn>;
  private binaryOperators: Record<string, BinaryOperatorFn>;
  private allowMemberAccess: boolean;
  private maxExpressionLength: number;
  private timeout: number;

  constructor(options: EvalBoxOptions = {}) {
    this.allowMemberAccess = options.allowMemberAccess ?? false;
    this.maxExpressionLength = options.maxExpressionLength ?? 2000;
    this.timeout = options.timeout ?? 1000;

    // Build enabled operator set
    let enabledOps: Set<string> | null = null;
    if (options.operators) {
      enabledOps = new Set<string>();
      for (const [op, enabled] of Object.entries(options.operators)) {
        if (enabled) enabledOps.add(op);
      }
    }

    this.parser = new Parser({
      maxDepth: options.maxDepth ?? 50,
      maxTokens: options.maxTokens ?? 500,
      allowMemberAccess: this.allowMemberAccess,
      enabledOperators: enabledOps,
    });

    // Merge defaults with user overrides
    this.functions = { ...defaultFunctions, ...options.functions };
    this.constants = { ...defaultConstants, ...options.constants };
    this.unaryOperators = { ...defaultUnaryOperators, ...options.unaryOperators };
    this.binaryOperators = { ...defaultBinaryOperators, ...options.binaryOperators };

    // Apply plugins
    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin);
      }
    }
  }

  /**
   * Register a plugin that extends EvalBox with functions, constants, or operators.
   */
  use(plugin: EvalBoxPlugin): this {
    if (plugin.functions) {
      Object.assign(this.functions, plugin.functions);
    }
    if (plugin.constants) {
      Object.assign(this.constants, plugin.constants);
    }
    if (plugin.unaryOperators) {
      Object.assign(this.unaryOperators, plugin.unaryOperators);
    }
    if (plugin.binaryOperators) {
      Object.assign(this.binaryOperators, plugin.binaryOperators);
    }
    if (plugin.setup) {
      plugin.setup(this);
    }
    return this;
  }

  /**
   * Add a custom function.
   */
  addFunction(name: string, fn: SafeFunction): this {
    this.functions[name] = fn;
    return this;
  }

  /**
   * Add a custom constant.
   */
  addConstant(name: string, value: any): this {
    this.constants[name] = value;
    return this;
  }

  /**
   * Add a custom unary operator.
   */
  addUnaryOperator(name: string, fn: UnaryOperatorFn): this {
    this.unaryOperators[name] = fn;
    return this;
  }

  /**
   * Add a custom binary operator.
   */
  addBinaryOperator(name: string, fn: BinaryOperatorFn): this {
    this.binaryOperators[name] = fn;
    return this;
  }

  /**
   * Parse an expression string into an AST (for inspection or caching).
   */
  parse(expr: string): ASTNode {
    this.validateInput(expr);
    return this.parser.parse(expr);
  }

  /**
   * Evaluate an expression string with an optional variable context.
   */
  evaluate<T = any>(expr: string, context: Record<string, any> = {}): T {
    const ast = this.parse(expr);
    return this.evaluateAST<T>(ast, context);
  }

  /**
   * Evaluate a pre-parsed AST with a variable context.
   * Useful for caching parsed expressions and re-evaluating with different contexts.
   */
  evaluateAST<T = any>(ast: ASTNode, context: Record<string, any> = {}): T {
    const ctx: EvaluatorContext = {
      variables: context,
      functions: this.functions,
      constants: this.constants,
      unaryOperators: this.unaryOperators,
      binaryOperators: this.binaryOperators,
      allowMemberAccess: this.allowMemberAccess,
      timeout: new TimeoutGuard(this.timeout),
    };
    return evaluate(ast, ctx) as T;
  }

  /**
   * Create a reusable compiled expression that can be evaluated multiple times.
   */
  compile(expr: string): CompiledExpression {
    const ast = this.parse(expr);
    return new CompiledExpression(ast, this);
  }

  /**
   * Get a snapshot of currently registered functions.
   */
  getFunctions(): string[] {
    return Object.keys(this.functions);
  }

  /**
   * Get a snapshot of currently registered constants.
   */
  getConstants(): Record<string, any> {
    return { ...this.constants };
  }

  private validateInput(expr: string): void {
    if (typeof expr !== 'string') {
      throw new TypeError('Expression must be a string');
    }
    if (expr.length > this.maxExpressionLength) {
      throw new LimitError(
        `Expression length ${expr.length} exceeds limit of ${this.maxExpressionLength}`
      );
    }
  }

  // ── Static convenience ──

  private static _shared: EvalBox | null = null;

  private static get shared(): EvalBox {
    if (!EvalBox._shared) {
      EvalBox._shared = new EvalBox();
    }
    return EvalBox._shared;
  }

  static evaluate<T = any>(expr: string, context?: Record<string, any>): T {
    return EvalBox.shared.evaluate<T>(expr, context);
  }

  static parse(expr: string): ASTNode {
    return EvalBox.shared.parse(expr);
  }
}

// ── Compiled expression ──

export class CompiledExpression {
  private ast: ASTNode;
  private box: EvalBox;

  constructor(ast: ASTNode, box: EvalBox) {
    this.ast = ast;
    this.box = box;
  }

  evaluate<T = any>(context: Record<string, any> = {}): T {
    return this.box.evaluateAST<T>(this.ast, context);
  }

  getAST(): ASTNode {
    return this.ast;
  }
}

// Re-export everything for extensibility
export type { ASTNode } from './ast';
export type {
  NumberLiteral, StringLiteral, TemplateLiteral, BooleanLiteral,
  NullLiteral, UndefinedLiteral, Identifier, UnaryExpression,
  BinaryExpression, ConditionalExpression, MemberExpression,
  OptionalMemberExpression, IndexExpression, CallExpression, ArrayExpression,
} from './ast';
export { TokenType } from './token';
export type { Token } from './token';
export { Tokenizer } from './tokenizer';
export { Parser } from './parser';
export { evaluate as evaluateAST } from './evaluator';
export type { EvaluatorContext } from './evaluator';
export { defaultUnaryOperators, defaultBinaryOperators } from './operators';
export type { UnaryOperatorFn, BinaryOperatorFn } from './operators';
export { defaultFunctions, defaultConstants } from './functions';
export type { SafeFunction } from './functions';
export {
  EvalBoxError, ParseError, SecurityError, TimeoutError, LimitError,
} from './errors';
export { TimeoutGuard, checkPropertyAccess, checkIdentifier } from './safety';
