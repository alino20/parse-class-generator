import Parse from "parse/node";
import { equal } from "assert";
import { ParseClassGenerator } from "@src/generate-new";
import { describe, it } from "mocha";
import { existsSync, rmSync } from "fs";
import path from "path";
import fc from "fast-check";
import { spawnSync } from "child_process";
import { TEST_SCHEMA } from "./schema";

const { APP_ID, SERVER_URL, MASTER_KEY } = process.env;

/**
 * checks if the file compiles without error
 * @param {string} filePath
 */
const compile = (filePath) => {
  const result = spawnSync(
    "tsc",
    ["--noEmit", "--allowSyntheticDefaultImports", `${filePath}`],
    { shell: true }
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.toString());
  }
};

describe("Test Parse Class Generator", function () {
  Parse.initialize(APP_ID, undefined, MASTER_KEY);
  Parse.serverURL = SERVER_URL;
  /**
   * @type Array<Parse.RestSchema>
   * @description List of all schemas
   */
  let schemas = [];

  this.beforeAll(async function () {
    this.timeout(10000);
    // return;
    // const fetched = await Parse.Schema.all();
    const fetched = TEST_SCHEMA;

    fetched.forEach((schema) => {
      schemas.push(schema);
    });
  });

  describe("Test Attributes File", function () {
    const outFilePath = path.join("types", "parse-class-attributes.d.ts");

    it("Should create valid files", async function () {
      this.timeout(10000);
      const generator = new ParseClassGenerator();
      const attrs = await generator.createAttributesFile(schemas, outFilePath);
      const fileExists = existsSync(outFilePath);
      equal(fileExists, true);
      compile(outFilePath);

      const classesPath = path.join("types", "parse-classes.ts");
      await attrs.createTsClassesFile(classesPath);
      compile(classesPath);
    });
  });
});
