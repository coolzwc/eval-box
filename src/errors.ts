export class EvalBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvalBoxError';
  }
}

export class ParseError extends EvalBoxError {
  public readonly position: number;

  constructor(message: string, position: number) {
    super(`Parse error at position ${position}: ${message}`);
    this.name = 'ParseError';
    this.position = position;
  }
}

export class SecurityError extends EvalBoxError {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class TimeoutError extends EvalBoxError {
  constructor(limit: number) {
    super(`Expression evaluation timed out after ${limit}ms`);
    this.name = 'TimeoutError';
  }
}

export class LimitError extends EvalBoxError {
  constructor(message: string) {
    super(message);
    this.name = 'LimitError';
  }
}
