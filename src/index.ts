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
        const isHasDefault = fallback !== undefined;
        if (typeof raw !== "string") {
          if (isHasDefault) {
            this.warnings.push(
              `⚠️  ${key} is not a string, using default value: "${fallback}"`
            );

            return fallback ?? ("" as TypeMap[T]);
          } else {
            this.errors.push(`❌ ${key} is not a string`);
          }
        }

        return raw as TypeMap[T];
      case "number": {
        const num = parseFloat(raw);

        if (isNaN(num)) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            const fallbackNum = parseFloat(`${fallback}`);

            if (isNaN(fallbackNum)) {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid number`
              );

              return fallback ?? (0 as TypeMap[T]);
            }

            this.warnings.push(
              `⚠️  ${key} is not a number, using default value: "${fallback}"`
            );

            return fallback ?? (0 as TypeMap[T]);
          } else {
            this.errors.push(`❌ ${key} is not a number`);
          }
        }

        return num as TypeMap[T];
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

        if (
          !trueValues.includes(raw.toLocaleLowerCase()) &&
          !falseValues.includes(raw.toLocaleLowerCase())
        ) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            if (typeof fallback !== "boolean") {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid boolean`
              );

              return fallback ?? (false as TypeMap[T]);
            }

            this.warnings.push(
              `⚠️  ${key} is not a boolean, using default value: "${fallback}"`
            );

            return fallback ?? (false as TypeMap[T]);
          } else {
            `❌ ${key} is not a boolean, expected one of the following: [${trueValues.join(
              ", "
            )}] or [${falseValues.join(", ")}]`;
          }
        }

        return trueValues.includes(raw.toLocaleLowerCase()) as TypeMap[T];
      }
      case "port": {
        const num = parseInt(raw);

        if (isNaN(num) || num < 1 || num > 65535) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            const fallbackInt = parseInt(`${fallback}`);

            if (isNaN(fallbackInt) || fallbackInt < 1 || fallbackInt > 65535) {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid port`
              );

              return fallback || (1 as TypeMap[T]);
            }

            this.warnings.push(
              `⚠️  ${key} is not a valid port, using default value: "${fallback}"`
            );

            return fallback || (1 as TypeMap[T]);
          } else {
            this.errors.push(
              `❌ ${key} is not a valid port, expected a number between 1 and 65535`
            );
          }
        }

        return num as TypeMap[T];
      }
      case "url": {
        let url: URL;
        try {
          url = new URL(raw);
        } catch {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            try {
              url = new URL(`${fallback}`);
            } catch {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid URL`
              );

              return fallback ?? ("" as TypeMap[T]);
            }

            this.warnings.push(
              `⚠️  ${key} is not a valid URL, using default value: "${fallback}"`
            );
          } else {
            this.errors.push(`❌ ${key} is not a valid URL`);

            return fallback ?? ("" as TypeMap[T]);
          }
        }

        if (!url?.protocol) {
          this.errors.push(
            `❌ ${key} is not a valid URL, protocol is undefined`
          );
        }

        return raw as TypeMap[T];
      }
      case "host": {
        const isValid = isIP(raw) || raw === "localhost";

        if (!isValid) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            if (!isIP(`${fallback}`) && fallback !== "localhost") {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid host`
              );

              return fallback as TypeMap[T];
            }

            this.warnings.push(
              `⚠️  ${key} is not a valid host, using default value: "${fallback}"`
            );

            return fallback as TypeMap[T];
          } else {
            this.errors.push(`❌ ${key} is not a valid host`);
          }
        }

        return raw as TypeMap[T];
      }
      case "json": {
        try {
          return JSON.parse(raw);
        } catch (error) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            this.warnings.push(
              `⚠️  ${key} is not a valid JSON, using default value`
            );

            return fallback as TypeMap[T];
          } else {
            this.errors.push(`❌ ${key} is not a valid JSON`);
          }
        }
      }
      case "email": {
        const emailRegex =
          /^(?!.*\.\.)[a-zA-Z0-9](\.?[a-zA-Z0-9_\-+%])*@[a-zA-Z0-9](\.?[a-zA-Z0-9\-])*\.[a-zA-Z]{2,}$/;

        if (!emailRegex.test(raw)) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            if (!emailRegex.test(`${fallback}`)) {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid email`
              );

              return fallback as TypeMap[T];
            }

            this.warnings.push(
              `⚠️  ${key} is not a valid email, using default value: "${fallback}"`
            );

            return fallback as TypeMap[T];
          } else {
            this.errors.push(`❌ ${key} is not a valid email`);
          }
        }

        return raw as TypeMap[T];
      }
      case "integer": {
        const numInt = parseInt(raw);
        const numFloat = parseFloat(raw);

        if (isNaN(numInt) || numInt !== numFloat) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            const fallbackStr = `${fallback}`;
            const fallbackInt = parseInt(fallbackStr);
            const fallbackFloat = parseFloat(fallbackStr);

            if (isNaN(fallbackInt) || fallbackInt !== fallbackFloat) {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not an integer`
              );

              return fallback as TypeMap[T];
            }

            this.warnings.push(
              `⚠️  ${key} is not an integer, using default value: "${fallback}"`
            );

            return fallback as TypeMap[T];
          } else {
            this.errors.push(`❌ ${key} is not an integer`);
          }
        }

        return numInt as TypeMap[T];
      }
      case "uuidv4": {
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidV4Regex.test(raw)) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            if (!uuidV4Regex.test(`${fallback}`)) {
              this.errors.push(
                `❌ fallback value for ${key} (${fallback}) is not a valid UUIDV4`
              );

              return (
                fallback ??
                ("00000000-0000-0000-0000-000000000000" as TypeMap[T])
              );
            }

            this.warnings.push(
              `⚠️  ${key} is not a valid UUIDV4, using default value: "${fallback}"`
            );

            return fallback;
          } else {
            this.errors.push(`❌ ${key} is not a valid UUIDV4`);
          }
        }

        return raw as TypeMap[T];
      }
      case "array": {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);

          if (!Array.isArray(parsed)) {
            this.errors.push(`❌ ${key} (JSON: ${raw}) is not an array`);

            return [] as TypeMap[T];
          }

          return parsed as TypeMap[T];
        } catch (error) {
          const isHasDefault = fallback !== undefined;

          if (isHasDefault) {
            if (!Array.isArray(fallback)) {
              this.errors.push(`❌ fallback value for ${key} is not an array`);

              return fallback as TypeMap[T];
            }

            this.warnings.push(
              `⚠️  ${key} is not a valid array, using default value: "${fallback}"`
            );

            return fallback as TypeMap[T];
          } else {
            this.errors.push(`❌ ${key} is not a valid array`);
          }
        }
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
