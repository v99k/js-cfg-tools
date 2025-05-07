import { config, DotenvConfigOptions } from 'dotenv';

/**
 * @description
 * Supported env variable types
 */
type TTypes = 'string' | 'number' | 'boolean';

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

/**
 * @description
 * Configuration factory function type
 */
export type CfgInitFn<T> = (tools: CfgTools) => T;

export function initCfg<T>(initFn: CfgInitFn<T>, opts?: DotenvConfigOptions): Cfg<T> {
  return new Cfg(initFn, opts);
}

/**
 * @description
 * Tools available to env factory (type-safe wrappers)
 */
export class CfgTools {
  constructor(
    private errors: string[],
    private warnings: string[],
  ) {}

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
      return this.castToType(type, '', key) as TypeMap[T];
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
    defaultValue: TypeMap[T],
  ): TypeMap[T] {
    const val = process.env[key];
    if (val === undefined) {
      this.warnings.push(`⚠️  ${key} is not defined, using default value: "${defaultValue}"`);
      return defaultValue;
    }

    return this.castToType(type, val, key, defaultValue) as TypeMap[T];
  }

  private castToType<T extends TTypes>(
    type: T,
    raw: string,
    key: string,
    fallback?: TypeMap[T],
  ): TypeMap[T] {
    switch (type) {
      case 'string':
        return raw as TypeMap[T];
      case 'number': {
        const num = parseFloat(raw);
        if (isNaN(num)) {
          const msg = `❌ ${key} is not a number`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }
        return num as TypeMap[T];
      }
      case 'boolean': {
        if (raw !== 'true' && raw !== 'false') {
          const msg = `❌ ${key} is not a boolean, expected 'true' or 'false'`;
          fallback ? this.warnings.push(msg) : this.errors.push(msg);
          return fallback as TypeMap[T];
        }
        return (raw === 'true') as TypeMap[T];
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
      console.warn('ENVIRONMENT WARNINGS:\n' + this.warnings.join('\n'));
    }
  }

  private proceedErrors() {
    if (this.errors.length > 0) {
      const errors = this.errors.join('\n');
      console.error('ENVIRONMENT ERRORS:\n' + errors);
      throw new Error(`Environment configuration errors detected:\n${errors}`);
    }
  }
}
