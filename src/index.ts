import { config, DotenvConfigOptions } from "dotenv";
import { isIP } from "net";

/**
 * @description
 * Supported env variable types
 */

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  port: number;
  url: string;
  host: string;
  json: unknown;
  email: string;
  integer: number;
  uuidv4: string;
  array: unknown[];
};

type TTypes = keyof TypeMap;

/**
 * @description
 * Configuration factory function type
 */
export type CfgInitFn<T> = (tools: CfgTools) => T;

export function initCfg<T>(
  initFn: CfgInitFn<T>,
  opts?: DotenvConfigOptions
): Cfg<T> {
  return new Cfg(initFn, opts);
}

/**
 * @description
 * Wraps the CfgTools methods to be used as a function.
 *
 * For cases when you need to create your own aliases for the CfgTools methods.
 *
 * @example
 * const cfg = initCfg(initFn);
 * const { mustBeDefined: must, recommendToBeDefined: should } = bindCfgTools(cfg.tools);
 *
 * const a = must("string", "A_STRING_VAR");
 * const b = should("number", "A_NUMBER_VAR", 0);
 */
export function bindCfgTools(ct: CfgTools) {
  return {
    mustBeDefined: <T extends TTypes>(type: T, key: string): TypeMap[T] =>
      ct.mustBeDefined(type, key),

    recommendToBeDefined: <T extends TTypes>(
      type: T,
      key: string,
      def: TypeMap[T]
    ): TypeMap[T] => ct.recommendToBeDefined(type, key, def),
  };
}

/**
 * @description
 * Tools available to env factory (type-safe wrappers)
 */
export class CfgTools {
  constructor(private errors: string[], private warnings: string[]) {}

  /**
   * @description
   * Writes an error to the errors array if the environment variable is not defined
   * @param type - The type of the environment variable
   * @param key - The key of the environment variable
   * @returns The environment variable value
   */
  mustBeDefined<T extends TTypes>(type: T, key: string): TypeMap[T] {
    const val = process.env[key];
    if (val === undefined) {
      this.errors.push(`❌ ${key} is not defined`);
      return this.castToType(type, "", key) as TypeMap[T];
    }

    return this.castToType(type, val, key) as TypeMap[T];
  }

  /**
   * @description
   * Writes a warning to the warnings array if the environment variable is not defined
   * @param type - The type of the environment variable
   * @param key - The key of the environment variable
   * @param defaultValue - The default value of the environment variable
   * @returns The environment variable value
   */
  recommendToBeDefined<T extends TTypes>(
    type: T,
    key: string,
    defaultValue: TypeMap[T]
  ): TypeMap[T] {
    const val = process.env[key];
    if (val === undefined) {
      this.warnings.push(
        `⚠️  ${key} is not defined, using default value: "${defaultValue}"`
      );
      return defaultValue;
    }

    return this.castToType(type, val, key, defaultValue) as TypeMap[T];
  }

  private castToType<T extends TTypes>(
    type: T,
    raw: string,
    key: string,
    fallback?: TypeMap[T]
  ): TypeMap[T] {
    switch (type) {
      case "string":
        return raw as TypeMap[T];
      case "number": {
        const num = parseFloat(raw);

        if (isNaN(num)) {
          const msg = `❌ ${key} is not a number`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return num as TypeMap[T];
      }
      case "boolean": {
        const trueValues = ["true", "1", "yes", "on", "enable", "enabled", "t", "y"];
        const falseValues = ["false", "0", "no", "off", "disable", "disabled", "f", "n"];

        if (!trueValues.includes(raw.toLocaleLowerCase()) && !falseValues.includes(raw.toLocaleLowerCase())) {
          const msg = `❌ ${key} is not a boolean, expected one of the following: [${trueValues.join(", ")}] or [${falseValues.join(", ")}]`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return (trueValues.includes(raw.toLocaleLowerCase())) as TypeMap[T];
      }
      case "port": {
        const num = parseInt(raw);

        if (isNaN(num) || num < 1 || num > 65535) {
          const msg = `❌ ${key} is not a valid port, expected a number between 1 and 65535`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return num as TypeMap[T];
      }
      case "url": {
        const url = new URL(raw);

        if (!url.protocol) {
          const msg = `❌ ${key} is not a valid URL`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return raw as TypeMap[T];
      }
      case "host": {
        const isValid = isIP(raw);

        if (!isValid) {
          const msg = `❌ ${key} is not a valid host`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return raw as TypeMap[T];
      }
      case "json": {
        try {
          return JSON.parse(raw) as TypeMap[T];
        } catch (error) {
          const msg = `❌ ${key} is not a valid JSON`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }
      }
      case "email": {
        const emailRegex =
          /^(?!.*\.\.)[a-zA-Z0-9](\.?[a-zA-Z0-9_\-+%])*@[a-zA-Z0-9](\.?[a-zA-Z0-9\-])*\.[a-zA-Z]{2,}$/;

        if (!emailRegex.test(raw)) {
          const msg = `❌ ${key} is not a valid email`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return raw as TypeMap[T];
      }
      case "integer": {
        const numInt = parseInt(raw);
        const numFloat = parseFloat(raw);

        if (isNaN(numInt) || numInt !== numFloat) {
          const msg = `❌ ${key} is not an integer`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return numInt as TypeMap[T];
      }
      case "uuidv4": {
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidV4Regex.test(raw)) {
          const msg = `❌ ${key} is not a valid UUIDV4`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }

        return raw as TypeMap[T];
      }
      case "array": {
        try {
          return JSON.parse(raw) as TypeMap[T];
        } catch (error) {
          const msg = `❌ ${key} is not a valid array`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }
      }
      default:
        return fallback as TypeMap[T];
    }
  }
}

/**
 * @description
 * Main configuration class
 */
export class Cfg<TEnv> {
  private environmentVariables: TEnv;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(initFn: CfgInitFn<TEnv>, opts?: DotenvConfigOptions) {
    config(opts ?? {});
    const tools = new CfgTools(this.errors, this.warnings);
    this.environmentVariables = initFn(tools);

    this.proceedWarnings();
    this.proceedErrors();
  }

  /**
   * @description
   * Access final env object
   */
  public get env(): TEnv {
    return structuredClone(this.environmentVariables);
  }

  private proceedWarnings() {
    if (this.warnings.length > 0) {
      console.warn("ENVIRONMENT WARNINGS:\n" + this.warnings.join("\n"));
    }
  }

  private proceedErrors() {
    if (this.errors.length > 0) {
      const errors = this.errors.join("\n");
      console.error("ENVIRONMENT ERRORS:\n" + errors);
      throw new Error(`Environment configuration errors detected:\n${errors}`);
    }
  }
}
