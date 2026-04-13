# eval-box

A secure, extensible JavaScript expression evaluation sandbox. Safely evaluate user-provided expressions without `eval()`, `new Function()`, or `vm` -- just a pure TypeScript lexer, parser, and tree-walk evaluator with configurable security controls.

## Features

- **Zero runtime dependencies** -- pure TypeScript, no external packages
- **Security first** -- prototype chain blocking, dangerous identifier rejection, configurable limits
- **Rich expression syntax** -- arithmetic, comparison, logic, ternary, nullish coalescing, template literals, array literals
- **60+ built-in functions** -- math, trig, string, array, type conversion
- **Plugin system** -- extend with custom functions, constants, and operators
- **Compiled expressions** -- parse once, evaluate many times with different contexts
- **Fully typed** -- complete TypeScript type definitions and AST exports

## Installation

```bash
npm install eval-box
```

## Quick Start

```typescript
import { EvalBox } from 'eval-box';

// Static convenience
EvalBox.evaluate('1 + 2');                          // 3
EvalBox.evaluate('price * qty', { price: 10, qty: 3 }); // 30

// Instance with options
const box = new EvalBox({ allowMemberAccess: true });
box.evaluate('user.name', { user: { name: 'Alice' } }); // 'Alice'
```

## Supported Syntax

### Literals

| Type | Examples |
|------|---------|
| Numbers | `42`, `3.14`, `.5`, `1e3`, `2.5e-1` |
| Hex / Binary / Octal | `0xFF`, `0b1010`, `0o17` |
| Strings | `'hello'`, `"world"` |
| Template literals | `` `hello ${name}` `` |
| Booleans | `true`, `false` |
| Null / Undefined | `null`, `undefined` |
| Arrays | `[1, 2, 3]` |

### Operators

| Category | Operators |
|----------|----------|
| Arithmetic | `+` `-` `*` `/` `%` `**` |
| Comparison | `==` `!=` `===` `!==` `>` `<` `>=` `<=` |
| Logical | `&&` `||` `!` (also: `and` `or` `not`) |
| Nullish coalescing | `??` |
| Ternary | `condition ? a : b` |
| Membership | `"a" in array` |
| Member access (opt-in) | `obj.prop`, `obj?.prop`, `arr[0]` |

### Operator Precedence (highest to lowest)

1. `**` (right-associative)
2. `*` `/` `%`
3. `+` `-`
4. `>` `<` `>=` `<=`
5. `==` `!=` `===` `!==`
6. `in`
7. `&&`
8. `||`
9. `??`
10. `? :` (ternary)

## Built-in Functions

### Math

```typescript
abs(-5)           // 5
ceil(1.2)         // 2
floor(1.8)        // 1
round(1.5)        // 2
trunc(1.9)        // 1
sign(-5)          // -1
sqrt(16)          // 4
cbrt(27)          // 3
pow(2, 10)        // 1024
exp(1)            // 2.718...
log(E)            // 1
log2(8)           // 3
log10(1000)       // 3
clamp(15, 0, 10)  // 10
random()          // 0..1
```

### Trigonometry

```typescript
sin(0)  cos(0)  tan(0)
asin(0) acos(1) atan(0) atan2(1, 0)
sinh(0) cosh(0) tanh(0)
asinh(0) acosh(1) atanh(0)
hypot(3, 4)       // 5
```

### Aggregation

```typescript
min(3, 1, 2)         // 1
max(3, 1, 2)         // 3
sum(1, 2, 3)         // 6
avg(2, 4, 6)         // 4
min([5, 2, 8])       // 2  (also accepts arrays)
```

### String

```typescript
length("hello")              // 5
toLowerCase("HELLO")         // "hello"
toUpperCase("hello")         // "HELLO"
trim("  hi  ")               // "hi"
startsWith("hello", "hel")   // true
endsWith("hello", "llo")     // true
includes("hello", "ell")     // true
indexOf("hello", "ll")       // 2
substring("hello", 1, 3)     // "el"
replace("hello", "l", "r")   // "herlo"
split("a,b,c", ",")          // ["a", "b", "c"]
concat("a", "b", "c")        // "abc"
```

### Array

```typescript
join(["a", "b"], "-")  // "a-b"
reverse([1, 2, 3])     // [3, 2, 1]
slice([1,2,3,4], 1, 3) // [2, 3]
flat([[1,2],[3,4]])     // [1, 2, 3, 4]
length([1, 2, 3])       // 3
```

### Type Conversion & Checking

```typescript
Number("42")     // 42
String(42)       // "42"
Boolean(1)       // true
isNaN(0/0)       // true
isFinite(42)     // true
isArray([1])     // true
typeof(42)       // "number"
```

### Constants

`PI`, `E`, `LN2`, `LN10`, `LOG2E`, `LOG10E`, `SQRT2`, `SQRT1_2`, `Infinity`, `NaN`

## Customization & Extensibility

### Custom Functions

```typescript
const box = new EvalBox({
  functions: {
    double: (x: number) => x * 2,
    greet: (name: string) => `Hello, ${name}!`,
  },
});

box.evaluate('double(21)');          // 42
box.evaluate('greet("World")');      // "Hello, World!"
```

Or add them dynamically (chainable):

```typescript
const box = new EvalBox()
  .addFunction('square', (x: number) => x * x)
  .addFunction('cube', (x: number) => x ** 3);

box.evaluate('square(4) + cube(2)');  // 24
```

### Custom Constants

```typescript
const box = new EvalBox({
  constants: { TAU: Math.PI * 2, GOLDEN: 1.618 },
});

box.evaluate('TAU');     // 6.2831...
box.evaluate('GOLDEN');  // 1.618
```

Or dynamically:

```typescript
box.addConstant('MAX_SCORE', 100);
box.evaluate('score <= MAX_SCORE', { score: 85 });  // true
```

### Custom Operators

```typescript
const box = new EvalBox({
  binaryOperators: {
    // Override + to always concatenate strings
    '+': (a, b) => String(a) + String(b),
  },
});

box.evaluate('1 + 2');  // "12"
```

### Plugin System

Plugins bundle related functions, constants, and operators into reusable modules:

```typescript
import { EvalBox, EvalBoxPlugin } from 'eval-box';

// Define a plugin
const datePlugin: EvalBoxPlugin = {
  name: 'date',
  functions: {
    now: () => Date.now(),
    year: () => new Date().getFullYear(),
    formatDate: (ts: number) => new Date(ts).toISOString(),
  },
  constants: {
    EPOCH: 0,
    DAY_MS: 86400000,
  },
};

// Use it
const box = new EvalBox({ plugins: [datePlugin] });
box.evaluate('year()');  // 2026

// Or register after construction (chainable)
box.use(anotherPlugin).use(yetAnotherPlugin);
```

#### Plugin with Setup Hook

The `setup` callback receives the `EvalBox` instance, enabling advanced initialization:

```typescript
const plugin: EvalBoxPlugin = {
  name: 'advanced',
  setup: (box) => {
    box.addFunction('register', () => 'registered');
    box.addConstant('VERSION', '1.0.0');
  },
};
```

#### Plugin Interface

```typescript
interface EvalBoxPlugin {
  name: string;
  functions?: Record<string, SafeFunction>;
  constants?: Record<string, any>;
  unaryOperators?: Record<string, UnaryOperatorFn>;
  binaryOperators?: Record<string, BinaryOperatorFn>;
  setup?: (box: EvalBox) => void;
}
```

### Operator Enable/Disable

Restrict which operators are allowed:

```typescript
const box = new EvalBox({
  operators: {
    '+': true, '-': true, '*': true, '/': true,
    '==': true, '!=': true, '===': true, '!==': true,
    '>': true, '<': true, '>=': true, '<=': true,
    '&&': true, '||': true,
    '**': false,  // disable exponentiation
    '%': false,   // disable modulo
  },
});

box.evaluate('1 + 2');    // 3
box.evaluate('2 ** 3');   // throws: Operator '**' is disabled
```

## Compiled Expressions

Parse an expression once, evaluate it many times with different contexts:

```typescript
const box = new EvalBox();

// Compile once
const expr = box.compile('price * qty * (1 - discount)');

// Evaluate many times
expr.evaluate({ price: 100, qty: 3, discount: 0.1 });  // 270
expr.evaluate({ price: 50, qty: 10, discount: 0.2 });   // 400

// Inspect the AST
console.log(expr.getAST());
```

Alternatively, use `parse()` + `evaluateAST()` for the same effect:

```typescript
const ast = box.parse('x ** 2 + y ** 2');
box.evaluateAST(ast, { x: 3, y: 4 });  // 25
box.evaluateAST(ast, { x: 5, y: 12 }); // 169
```

## Security

### Design Principles

1. **No native eval** -- pure lexer + parser + tree-walk evaluator; zero use of `eval`, `Function`, or `vm`
2. **Prototype chain blocking** -- access to `__proto__`, `prototype`, `constructor`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__` throws `SecurityError`
3. **Dangerous identifier blocking** -- `eval`, `Function`, `require`, `import`, `globalThis`, `global`, `window`, `self`, `process`, `module`, `exports` throw `SecurityError`
4. **No arbitrary function calls** -- only explicitly registered functions can be called; context variables cannot be invoked
5. **Member access off by default** -- must opt-in via `allowMemberAccess: true`
6. **Complexity limits** -- configurable max expression length, token count, and AST depth
7. **Timeout** -- configurable evaluation timeout (default: 1000ms)
8. **Input validation** -- tokenizer rejects unknown characters immediately

### Security Options

```typescript
const box = new EvalBox({
  allowMemberAccess: false,       // default: no obj.prop access
  maxExpressionLength: 2000,      // default: 2000 characters
  maxTokens: 500,                 // default: 500 tokens
  maxDepth: 50,                   // default: 50 nesting levels
  timeout: 1000,                  // default: 1000ms
});
```

### Error Types

```typescript
import {
  EvalBoxError,    // base error class
  ParseError,      // syntax errors (includes position)
  SecurityError,   // security violations
  TimeoutError,    // evaluation timeout
  LimitError,      // expression complexity limits
} from 'eval-box';

try {
  box.evaluate('obj.__proto__', { obj: {} });
} catch (e) {
  if (e instanceof SecurityError) {
    console.log('Blocked!', e.message);
  }
}
```

## Advanced Usage

### AST Inspection

All AST node types are exported for building custom tooling:

```typescript
import { EvalBox, ASTNode } from 'eval-box';

const ast = EvalBox.parse('1 + 2 * 3');
// {
//   type: 'BinaryExpression',
//   operator: '+',
//   left: { type: 'NumberLiteral', value: 1 },
//   right: {
//     type: 'BinaryExpression',
//     operator: '*',
//     left: { type: 'NumberLiteral', value: 2 },
//     right: { type: 'NumberLiteral', value: 3 }
//   }
// }
```

### Direct Tokenizer/Parser Access

For advanced use cases, the internal components are fully exported:

```typescript
import { Tokenizer, Parser, evaluateAST } from 'eval-box';

// Tokenize
const tokenizer = new Tokenizer('1 + 2');
const tokens = tokenizer.tokenize();

// Parse
const parser = new Parser({ allowMemberAccess: false });
const ast = parser.parse('1 + 2');
```

### Introspection

```typescript
const box = new EvalBox();

// List all registered function names
box.getFunctions();   // ['abs', 'ceil', 'floor', ...]

// Get all constants with values
box.getConstants();   // { PI: 3.14159..., E: 2.71828..., ... }
```

## Real-World Examples

### Rule Engine

```typescript
const box = new EvalBox();

const rules = [
  { condition: 'age >= 18 and status === "active"', action: 'allow' },
  { condition: 'score > 90', action: 'award_bonus' },
  { condition: 'balance < 0', action: 'send_alert' },
];

const context = { age: 25, status: 'active', score: 95, balance: 100 };

const triggered = rules.filter(r => box.evaluate(r.condition, context));
```

### Dynamic Pricing

```typescript
const box = new EvalBox()
  .addFunction('tierDiscount', (qty: number) =>
    qty >= 100 ? 0.2 : qty >= 50 ? 0.1 : qty >= 10 ? 0.05 : 0
  );

const formula = 'price * qty * (1 - tierDiscount(qty))';
box.evaluate(formula, { price: 29.99, qty: 75 }); // 2024.325
```

### Template Rendering

```typescript
const box = new EvalBox();

const template = '`Dear ${name}, your order #${orderId} totals $${total}`';
box.evaluate(template, { name: 'Alice', orderId: 1234, total: 99.99 });
// "Dear Alice, your order #1234 totals $99.99"
```

### Form Validation

```typescript
const box = new EvalBox();

const validations = {
  email: 'includes(value, "@") and length(value) >= 5',
  age: 'value >= 0 and value <= 150',
  password: 'length(value) >= 8',
};

function validate(field: string, value: any): boolean {
  return box.evaluate(validations[field], { value });
}
```

## API Reference

### `EvalBox`

| Method | Description |
|--------|------------|
| `constructor(options?)` | Create an instance with optional configuration |
| `evaluate(expr, context?)` | Evaluate an expression string |
| `parse(expr)` | Parse an expression into an AST |
| `evaluateAST(ast, context?)` | Evaluate a pre-parsed AST |
| `compile(expr)` | Create a reusable `CompiledExpression` |
| `use(plugin)` | Register a plugin (chainable) |
| `addFunction(name, fn)` | Add a custom function (chainable) |
| `addConstant(name, value)` | Add a custom constant (chainable) |
| `addUnaryOperator(name, fn)` | Add a custom unary operator (chainable) |
| `addBinaryOperator(name, fn)` | Add a custom binary operator (chainable) |
| `getFunctions()` | List all registered function names |
| `getConstants()` | Get all constants with their values |
| `static evaluate(expr, context?)` | Static convenience method |
| `static parse(expr)` | Static convenience method |

### `CompiledExpression`

| Method | Description |
|--------|------------|
| `evaluate(context?)` | Evaluate with a variable context |
| `getAST()` | Get the parsed AST node |

### `EvalBoxOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowMemberAccess` | `boolean` | `false` | Enable `obj.prop` and `arr[i]` access |
| `operators` | `Record<string, boolean>` | `null` (all enabled) | Enable/disable specific operators |
| `functions` | `Record<string, Function>` | -- | Custom functions (merged with built-ins) |
| `constants` | `Record<string, any>` | -- | Custom constants (merged with built-ins) |
| `unaryOperators` | `Record<string, Function>` | -- | Custom unary operators |
| `binaryOperators` | `Record<string, Function>` | -- | Custom binary operators |
| `maxExpressionLength` | `number` | `2000` | Max input string length |
| `maxTokens` | `number` | `500` | Max number of tokens |
| `maxDepth` | `number` | `50` | Max AST nesting depth |
| `timeout` | `number` | `1000` | Evaluation timeout in ms |
| `plugins` | `EvalBoxPlugin[]` | -- | Plugins to load |

## License

MIT
