# cfg-utils

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
npm install cfg-utils
```

> `dotenv` is a required peer dependency.

---

## 🚀 Quick Start

```ts
// config.ts
import { initCfg } from 'cfg-utils';

const cfg = initCfg((ct) => ({
    nodeEnv: ct.recommendToBeDefined('string', 'NODE_ENV', 'development'),
    app: {
        port: ct.mustBeDefined('number', 'PORT'),
        debug: ct.recommendToBeDefined('boolean', 'DEBUG', false),
    },
}));

export const AppEnv = cfg.env;
```

```ts
// main.ts
import { AppEnv } from './config';

console.log(AppEnv.app.port); // number
console.log(AppEnv.app.debug); // boolean
console.log(AppEnv.nodeEnv); // string
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

#### `mustBeDefined(type, key): string | number | boolean`

Fails the application if the variable is missing or invalid.

#### `recommendToBeDefined(type, key, defaultValue): string | number | boolean`

Uses the default if the variable is missing or invalid. Emits a warning.

Supported types:

- `'string'`
- `'number'`
- `'boolean'`

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
