# cfg-tools

> A tiny, type-safe configuration helper for environment variables based on [dotenv](https://www.npmjs.com/package/dotenv) with developer-friendly validation.

---

## ✨ Features

- ⚡ Zero-boilerplate configuration management
- 🛡️ Full type safety without maintaining manual types
- 🧠 Auto-infers config structure from your factory
- ✅ Required variables with validation
- ⚠️ Optional variables with default values and warnings
- 📦 Dotenv support included

---

## 📦 Installation

```bash
npm install cfg-tools
```

> `dotenv` is a required peer dependency.

---

## 🚀 Quick Start

```ts
// config.ts
import { initCfg } from "cfg-tools";

const cfg = initCfg((ct) => ({
  nodeEnv: ct.recommendToBeDefined("string", "NODE_ENV", "development"),
  app: {
    port: ct.mustBeDefined("port", "PORT"),
    debug: ct.recommendToBeDefined("boolean", "DEBUG", false),
  },
}));

export const AppEnv = cfg.env;
```

```ts
// main.ts
import { AppEnv } from "./config";

console.log(AppEnv.app.port); // number (port)
console.log(AppEnv.app.debug); // boolean
console.log(AppEnv.nodeEnv); // string
```

### Features

You can also use your own aliases for "recommendToBeDefined" and "mustBeDefined" methods.

```ts
import { initCfg, bindCfgTools } from "cfg-tools";

const cfg = initCfg(initFn);
const { mustBeDefined: must, recommendToBeDefined: should } = bindCfgTools(
  cfg.tools
);

const a = must("string", "A_STRING_VAR");
const b = should("number", "A_NUMBER_VAR", 0);
```

---

## 🛠️ API

### `initCfg(fn, opts?)`

Initializes your configuration. Takes:

- a factory function: `(tools) => ({ ...your config })`
- optional dotenv config

Returns an object: `{ env }` where `env` is your parsed and validated config.

---

### Tools available inside the factory:

#### `mustBeDefined(type, key)`

Fails the application if the variable is missing or invalid.

#### `recommendToBeDefined(type, key, defaultValue)`

Uses the default if the variable is missing or invalid. Emits a warning.

Supported types:

- `'string'` - get string value
- `'number'` - get numeric value with parseFloat (example: 123, 3.1415, 3e4)
- `'boolean'` - get boolean value (supported values: "true", "1", "yes", "on", "enable", "enabled", "t", "y", "false", "0", "no", "off", "disable", "disabled", "f", "n")
- `'port'` - get int value between 1 and 65535
- `'url'` - get URL, uses with default [new URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)
- `'host'` - get ip v4 or v6
- `'json'` - get object with JSON.parse
- `'email'` - get email (format: qwe@rty.ui)
- `'integer'` - get integer value
- `'uuidv4'` - get uuid v4
- `'array'` - get array (json-like: [1, 2, 3, 4, 5] or plain (each element will be string): 1,2,3,4,5)

---

## 📁 Example .env

```env
PORT=3000
NODE_ENV=production
DEBUG=true
```

---

## 🧪 Type Inference

No need to define a separate type — config type is inferred automatically:

```ts
type AppEnv = typeof cfg.env;
```

---

## 🧷 License

[MIT](./LICENSE)
