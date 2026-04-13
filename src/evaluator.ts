import { ASTNode } from './ast';
import { UnaryOperatorFn, BinaryOperatorFn } from './operators';
import { SafeFunction } from './functions';
import { EvalBoxError, SecurityError } from './errors';
import { checkPropertyAccess, checkIdentifier, TimeoutGuard } from './safety';

export interface EvaluatorContext {
  variables: Record<string, any>;
  functions: Record<string, SafeFunction>;
  constants: Record<string, any>;
  unaryOperators: Record<string, UnaryOperatorFn>;
  binaryOperators: Record<string, BinaryOperatorFn>;
  allowMemberAccess: boolean;
  timeout: TimeoutGuard;
}

const hasOwn = Object.prototype.hasOwnProperty;

export function evaluate(node: ASTNode, ctx: EvaluatorContext): any {
  ctx.timeout.check();

  switch (node.type) {
    case 'NumberLiteral':
      return node.value;

    case 'StringLiteral':
      return node.value;

    case 'BooleanLiteral':
      return node.value;

    case 'NullLiteral':
      return null;

    case 'UndefinedLiteral':
      return undefined;

    case 'Identifier':
      return resolveIdentifier(node.name, ctx);

    case 'UnaryExpression':
      return evalUnary(node.operator, node.operand, ctx);

    case 'BinaryExpression':
      return evalBinary(node.operator, node.left, node.right, ctx);

    case 'ConditionalExpression':
      return evaluate(node.test, ctx)
        ? evaluate(node.consequent, ctx)
        : evaluate(node.alternate, ctx);

    case 'MemberExpression':
      return evalMember(node.object, node.property, ctx);

    case 'OptionalMemberExpression':
      return evalOptionalMember(node.object, node.property, ctx);

    case 'IndexExpression':
      return evalIndex(node.object, node.index, ctx);

    case 'CallExpression':
      return evalCall(node.callee, node.args, ctx);

    case 'ArrayExpression':
      return node.elements.map(el => evaluate(el, ctx));

    case 'TemplateLiteral':
      return node.parts
        .map(part => typeof part === 'string' ? part : String(evaluate(part, ctx)))
        .join('');

    default:
      throw new SecurityError(`Unknown node type: ${(node as any).type}`);
  }
}

function resolveIdentifier(name: string, ctx: EvaluatorContext): any {
  checkIdentifier(name);

  if (hasOwn.call(ctx.constants, name)) return ctx.constants[name];
  if (hasOwn.call(ctx.functions, name)) return ctx.functions[name];
  if (hasOwn.call(ctx.variables, name)) return ctx.variables[name];

  throw new EvalBoxError(`Undefined variable: ${name}`);
}

function evalUnary(op: string, operand: ASTNode, ctx: EvaluatorContext): any {
  const fn = ctx.unaryOperators[op];
  if (!fn) throw new EvalBoxError(`Unknown unary operator: ${op}`);
  return fn(evaluate(operand, ctx));
}

function evalBinary(op: string, left: ASTNode, right: ASTNode, ctx: EvaluatorContext): any {
  const fn = ctx.binaryOperators[op];
  if (!fn) throw new EvalBoxError(`Unknown binary operator: ${op}`);

  // Short-circuit evaluation for logical operators
  if (op === '&&') return evaluate(left, ctx) && evaluate(right, ctx);
  if (op === '||') return evaluate(left, ctx) || evaluate(right, ctx);
  if (op === '??') {
    const lv = evaluate(left, ctx);
    return lv != null ? lv : evaluate(right, ctx);
  }

  return fn(evaluate(left, ctx), evaluate(right, ctx));
}

function evalMember(objNode: ASTNode, property: string, ctx: EvaluatorContext): any {
  if (!ctx.allowMemberAccess) {
    throw new SecurityError('Member access is disabled');
  }
  checkPropertyAccess(property);
  const obj = evaluate(objNode, ctx);
  if (obj == null) {
    throw new EvalBoxError(`Cannot read property '${property}' of ${obj}`);
  }
  return obj[property];
}

function evalOptionalMember(objNode: ASTNode, property: string, ctx: EvaluatorContext): any {
  if (!ctx.allowMemberAccess) {
    throw new SecurityError('Member access is disabled');
  }
  checkPropertyAccess(property);
  const obj = evaluate(objNode, ctx);
  if (obj == null) return undefined;
  return obj[property];
}

function evalIndex(objNode: ASTNode, indexNode: ASTNode, ctx: EvaluatorContext): any {
  if (!ctx.allowMemberAccess) {
    throw new SecurityError('Member access is disabled');
  }
  const obj = evaluate(objNode, ctx);
  const index = evaluate(indexNode, ctx);

  if (typeof index === 'string') {
    checkPropertyAccess(index);
  }

  if (obj == null) {
    throw new EvalBoxError(`Cannot read index of ${obj}`);
  }
  return obj[index];
}

function evalCall(callee: string, argNodes: ASTNode[], ctx: EvaluatorContext): any {
  checkIdentifier(callee);

  if (!hasOwn.call(ctx.functions, callee)) {
    throw new EvalBoxError(`Unknown function: ${callee}`);
  }

  const fn = ctx.functions[callee];
  const args = argNodes.map(a => evaluate(a, ctx));
  return fn(...args);
}
