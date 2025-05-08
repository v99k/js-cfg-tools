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
    // if (val === undefined) {
    //   this.warnings.push(
    //     `⚠️  ${key} is not defined, using default value: "${defaultValue}"`
    //   );
    //   return defaultValue;
    // }

    return this.castToType(type, val ?? "", key, defaultValue) as TypeMap[T];
  }

  private castToType<T extends TTypes>(
    type: T,
    raw: string,
    key: string,
    fallback?: TypeMap[T]
  ): TypeMap[T] {
    switch (type) {
      case "string":
        const isValid = typeof raw === "string";
        const isHasDefault = fallback !== undefined;
        const isDefaultValid = typeof fallback === "string";

        if (isValid) {
          return raw as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a string`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a string`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a string, using default value: "${fallback}"`
          );
        }

        return fallback ?? ("" as TypeMap[T]);
      case "number": {
        const num = parseFloat(raw);
        const isValid = !isNaN(num);
        const isHasDefault = fallback !== undefined;
        const defaultNum = parseFloat(`${fallback}`);
        const isDefaultValid = !isNaN(defaultNum);

        if (isValid) {
          return num as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a number`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a number`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a number, using default value: "${fallback}"`
          );
        }

        return fallback ?? (0 as TypeMap[T]);
      }
      case "boolean": {
        const trueValues = [
          "true",
          "1",
          "yes",
          "on",
          "enable",
          "enabled",
          "t",
          "y",
        ];
        const falseValues = [
          "false",
          "0",
          "no",
          "off",
          "disable",
          "disabled",
          "f",
          "n",
        ];
        const isTrue = trueValues.includes(raw.toLocaleLowerCase());
        const isFalse = falseValues.includes(raw.toLocaleLowerCase());
        const isValid = isTrue || isFalse;
        const isHasDefault = fallback !== undefined;
        const isDefaultTrue = trueValues.includes(
          `${fallback}`.toLocaleLowerCase()
        );
        const isDefaultFalse = falseValues.includes(
          `${fallback}`.toLocaleLowerCase()
        );
        const isDefaultValid = isDefaultTrue || isDefaultFalse;

        if (isValid) {
          return isTrue as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a boolean`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a boolean`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a boolean, using default value: "${fallback}"`
          );
        }

        return isDefaultTrue as TypeMap[T];
      }
      case "port": {
        const num = parseInt(raw);
        const isValid = !isNaN(num) && num >= 1 && num <= 65535;
        const isHasDefault = fallback !== undefined;
        const defaultNum = parseInt(`${fallback}`);
        const isDefaultValid =
          !isNaN(defaultNum) && defaultNum >= 1 && defaultNum <= 65535;

        if (isValid) {
          return num as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a valid port`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a valid port`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a valid port, using default value: "${fallback}"`
          );
        }

        return fallback ?? (1 as TypeMap[T]);
      }
      case "url": {
        let url: URL;
        let isValid = false;
        let isDefaultValid = false;
        const isHasDefault = fallback !== undefined;

        try {
          url = new URL(raw);
          isValid = true;
        } catch {
          isValid = false;
        }

        if (isHasDefault) {
          try {
            new URL(`${fallback}`);
            isDefaultValid = true;
          } catch {
            isDefaultValid = false;
          }
        }

        if (isValid) {
          return raw as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a valid URL`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a valid URL`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a valid URL, using default value: "${fallback}"`
          );
        }

        return fallback ?? ("" as TypeMap[T]);
      }
      case "host": {
        const isValid = isIP(raw) || raw === "localhost";
        const isHasDefault = fallback !== undefined;
        const isDefaultValid = isIP(`${fallback}`) || fallback === "localhost";

        if (isValid) {
          return raw as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a valid host`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a valid host`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a valid host, using default value: "${fallback}"`
          );
        }

        return fallback ?? ("localhost" as TypeMap[T]);
      }
      case "json": {
        const isHasDefault = fallback !== undefined;
        let isValid = false;

        try {
          JSON.parse(raw);
          isValid = true;
        } catch (error) {
          isValid = false;
        }

        if (isValid) {
          return raw as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a valid JSON`);
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a valid JSON, using default value`
          );
        }

        return fallback ?? ({} as TypeMap[T]);
      }
      case "email": {
        const emailRegex =
          /^(?!.*\.\.)[a-zA-Z0-9](\.?[a-zA-Z0-9_\-+%])*@[a-zA-Z0-9](\.?[a-zA-Z0-9\-])*\.[a-zA-Z]{2,}$/;
        const isHasDefault = fallback !== undefined;
        const isValid = emailRegex.test(raw);
        const isDefaultValid = emailRegex.test(`${fallback}`);

        if (isValid) {
          return raw as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a valid email`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a valid email`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a valid email, using default value: "${fallback}"`
          );
        }

        return fallback ?? ("" as TypeMap[T]);
      }
      case "integer": {
        const numInt = parseInt(raw);
        const numFloat = parseFloat(raw);
        const isValid = !isNaN(numInt) && numInt === numFloat;
        const isHasDefault = fallback !== undefined;
        const defaultNumInt = parseInt(`${fallback}`);
        const defaultNumFloat = parseFloat(`${fallback}`);
        const isDefaultValid =
          !isNaN(defaultNumInt) && defaultNumInt === defaultNumFloat;

        if (isValid) {
          return numInt as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not an integer`);
        } else if (!isDefaultValid) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not an integer`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not an integer, using default value: "${fallback}"`
          );
        }

        return fallback ?? (0 as TypeMap[T]);
      }
      case "uuidv4": {
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isValid = uuidV4Regex.test(raw);
        const isHasDefault = fallback !== undefined;
        const isValidDefault = uuidV4Regex.test(`${fallback}`);

        if (isValid) {
          return raw as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not a valid UUIDV4`);
        } else if (!isValidDefault) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not a valid UUIDV4`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not a valid UUIDV4, using default value: "${fallback}"`
          );
        }

        return (
          fallback ?? ("00000000-0000-0000-0000-000000000000" as TypeMap[T])
        );
      }
      case "array": {
        const isHasDefault = fallback !== undefined;
        const isValidDefault = Array.isArray(fallback);
        let isValid = false;
        let parsed: unknown[] = [];

        try {
          parsed = JSON.parse(raw);
          isValid = Array.isArray(parsed);
        } catch (error) {
          const arrayFromString = raw?.split(",") ?? [];
          parsed = arrayFromString;
          isValid = parsed.length > 0;
        }

        if (isValid) {
          return parsed as TypeMap[T];
        } else if (!isHasDefault) {
          this.errors.push(`❌ ${key} is not an array`);
        } else if (!isValidDefault) {
          this.errors.push(
            `❌ fallback value for ${key} (${fallback}) is not an array`
          );
        } else {
          this.warnings.push(
            `⚠️  ${key} is not an array, using default value: "${fallback}"`
          );
        }

        return fallback ?? ([] as TypeMap[T]);
      }
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }
}

/**
 * @description
 * Main configuration class
 */
export class Cfg<TEnv> {
  private environmentVariables: TEnv;
  private errorsList: string[] = [];
  private warningsList: string[] = [];

  constructor(initFn: CfgInitFn<TEnv>, opts?: DotenvConfigOptions) {
    config(opts ?? {});
    const tools = new CfgTools(this.errorsList, this.warningsList);
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

  public get errors(): string[] {
    return this.errorsList;
  }

  public get warnings(): string[] {
    return this.warningsList;
  }

  private proceedWarnings() {
    if (this.warningsList.length > 0) {
      console.warn("ENVIRONMENT WARNINGS:\n" + this.warningsList.join("\n"));
    }
  }

  private proceedErrors() {
    if (this.errorsList.length > 0) {
      const errors = this.errorsList.join("\n");
      console.error("ENVIRONMENT ERRORS:\n" + errors);
      throw new Error(`Environment configuration errors detected:\n${errors}`);
    }
  }
}
