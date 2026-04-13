export enum TokenType {
  Number = 'Number',
  String = 'String',
  Template = 'Template',
  Boolean = 'Boolean',
  Null = 'Null',
  Undefined = 'Undefined',
  Identifier = 'Identifier',
  Operator = 'Operator',
  UnaryOperator = 'UnaryOperator',
  OpenParen = 'OpenParen',
  CloseParen = 'CloseParen',
  OpenBracket = 'OpenBracket',
  CloseBracket = 'CloseBracket',
  Comma = 'Comma',
  Dot = 'Dot',
  OptionalChain = 'OptionalChain',
  Question = 'Question',
  Colon = 'Colon',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string | number | boolean | null | undefined;
  raw: string;
  position: number;
}
