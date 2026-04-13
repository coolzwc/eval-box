export type ASTNode =
  | NumberLiteral
  | StringLiteral
  | TemplateLiteral
  | BooleanLiteral
  | NullLiteral
  | UndefinedLiteral
  | Identifier
  | UnaryExpression
  | BinaryExpression
  | ConditionalExpression
  | MemberExpression
  | OptionalMemberExpression
  | IndexExpression
  | CallExpression
  | ArrayExpression;

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface TemplateLiteral {
  type: 'TemplateLiteral';
  parts: (string | ASTNode)[];
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral {
  type: 'NullLiteral';
}

export interface UndefinedLiteral {
  type: 'UndefinedLiteral';
}

export interface Identifier {
  type: 'Identifier';
  name: string;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: string;
  operand: ASTNode;
}

export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface ConditionalExpression {
  type: 'ConditionalExpression';
  test: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface MemberExpression {
  type: 'MemberExpression';
  object: ASTNode;
  property: string;
}

export interface OptionalMemberExpression {
  type: 'OptionalMemberExpression';
  object: ASTNode;
  property: string;
}

export interface IndexExpression {
  type: 'IndexExpression';
  object: ASTNode;
  index: ASTNode;
}

export interface CallExpression {
  type: 'CallExpression';
  callee: string;
  args: ASTNode[];
}

export interface ArrayExpression {
  type: 'ArrayExpression';
  elements: ASTNode[];
}
