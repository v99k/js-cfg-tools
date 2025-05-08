import { initCfg, bindCfgTools, Cfg } from "../src";

let cfg: Cfg<any> = {} as Cfg<any>;
try {
  cfg = initCfg(
    (tools) => {
      const { mustBeDefined: must, recommendToBeDefined: should } =
        bindCfgTools(tools);

      return {
        // PORT
        validPort: must("port", "VALID_PORT"),
        invalidPort: should("port", "INVALID_PORT", 456),
        undefinedPort: should("port", "UNDEFINED_PORT", 4000),
        // HOST
        validHost: must("host", "VALID_HOST"),
        invalidHost: should("host", "INVALID_HOST", "localhost"),
        undefinedHost: should("host", "UNDEFINED_HOST", "localhost"),
        // INTEGER
        validInteger: must("integer", "VALID_INTEGER"),
        invalidInteger: should("integer", "INVALID_INTEGER", 123),
        undefinedInteger: should("integer", "UNDEFINED_INTEGER", 123),
        // FLOAT
        validFloat: must("number", "VALID_FLOAT"),
        invalidFloat: should("number", "INVALID_FLOAT", 123),
        undefinedFloat: should("number", "UNDEFINED_FLOAT", 123),
        // BOOLEAN
        validBoolean: must("boolean", "VALID_BOOLEAN"),
        invalidBoolean: should("boolean", "INVALID_BOOLEAN", true),
        undefinedBoolean: should("boolean", "UNDEFINED_BOOLEAN", true),
        // ARRAY
        validArray: must("array", "VALID_ARRAY"),
        invalidArray: should("array", "INVALID_ARRAY", [1, 2, 3]),
        undefinedArray: should("array", "UNDEFINED_ARRAY", [1, 2, 3]),
        // JSON
        validJson: must("json", "VALID_JSON"),
        invalidJson: should("json", "INVALID_JSON", { key: "value" }),
        undefinedJson: should("json", "UNDEFINED_JSON", { key: "value" }),
        // EMAIL
        validEmail: must("email", "VALID_EMAIL"),
        invalidEmail: should("email", "INVALID_EMAIL", "test@test.com"),
        undefinedEmail: should("email", "UNDEFINED_EMAIL", "test@test.com"),
        // // URL
        // validUrl: must("url", "VALID_URL"),
        // invalidUrl: should("url", "INVALID_URL", "https://test.com"),
        // undefinedUrl: should("url", "UNDEFINED_URL", "https://test.com"),
        // UUIDV4
        validUuidv4: must("uuidv4", "VALID_UUIDV4"),
        invalidUuidv4: should(
          "uuidv4",
          "INVALID_UUIDV4",
          "d18d39a8-a4a0-484b-b676-0798ab3cc333"
        ),
        undefinedUuidv4: should(
          "uuidv4",
          "UNDEFINED_UUIDV4",
          "d18d39a8-a4a0-484b-b676-0798ab3cc333"
        ),
        // URL with fallback
        invalidUrlWithFallback: should(
          "url",
          "INVALID_URL_WITH_FALLBACK",
          "test"
        ),
        undefinedUrlWithFallback: should(
          "url",
          "UNDEFINED_URL_WITH_FALLBACK",
          "test"
        ),
      };
    },
    {
      path: ".example.env",
    }
  );
} catch (error) {
  // ok, for example
}
