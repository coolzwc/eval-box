import { SecurityError, TimeoutError } from './errors';

const BLOCKED_PROPERTIES = new Set([
  '__proto__',
  'prototype',
  'constructor',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

const BLOCKED_IDENTIFIERS = new Set([
  'eval',
  'Function',
  'require',
  'import',
  'globalThis',
  'global',
  'window',
  'self',
  'process',
  'module',
  'exports',
  'constructor',
  '__proto__',
]);

export function checkPropertyAccess(property: string): void {
  if (BLOCKED_PROPERTIES.has(property)) {
    throw new SecurityError(`Access to '${property}' is not allowed`);
  }
}

export function checkIdentifier(name: string): void {
  if (BLOCKED_IDENTIFIERS.has(name)) {
    throw new SecurityError(`Access to '${name}' is not allowed`);
  }
}

export function safePropertyGet(obj: any, property: string): any {
  checkPropertyAccess(property);
  if (obj == null) return undefined;
  return obj[property];
}

export class TimeoutGuard {
  private startTime: number;
  private limit: number;
  private checkCount: number = 0;

  constructor(limit: number) {
    this.limit = limit;
    this.startTime = Date.now();
  }

  check(): void {
    this.checkCount++;
    // Only check wall clock every 100 operations to reduce overhead
    if (this.checkCount % 100 === 0) {
      if (Date.now() - this.startTime > this.limit) {
        throw new TimeoutError(this.limit);
      }
    }
  }
}
