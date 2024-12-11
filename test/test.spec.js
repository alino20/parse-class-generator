import { ParseClassGenerator } from "@src/generate";
import { equal } from "assert";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { describe, it } from "mocha";
import Parse from "parse/node";
import path from "path";
import { TEST_SCHEMA } from "./schema";

const { APP_ID, SERVER_URL, MASTER_KEY } = process.env;

/**
 * checks if the file compiles without error
 * @param {string} filePath
 */
const compile = (filePath) => {
  const result = spawnSync(
    "tsc",
    [
      "--noEmit",
      "--allowSyntheticDefaultImports",
      "--allowJS",
      "--checkJS",
      `${filePath}`,
    ],
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
    this.timeout(10000);
    this.slow(5000);

    let attrs = null;

    it("Should create valid attributes file", async function () {
      const generator = new ParseClassGenerator();
      attrs = await generator.createAttributesFile(schemas, outFilePath);
      const fileExists = existsSync(outFilePath);
      equal(fileExists, true);
      compile(outFilePath);
    });

    it("Should create valid classes file", async function () {
      const classesPath = path.join("types", "parse-classes.ts");
      await attrs.createTsClassesFile(classesPath);
      compile(classesPath);
    });

    it("Should create valid declarations file", async function () {
      const declarationsPath = path.join(
        "types",
        "parse-class-declarations.d.ts"
      );
      await attrs.createDeclarationsFile(declarationsPath);
      compile(declarationsPath);
    });

    it("Should create valid jsDoc file", async function () {
      const jsDocPath = path.join("types", "parse-jsdoc.js");
      await attrs.createJsDocFile(jsDocPath);
      compile(jsDocPath);
    });
  });
});

/**
 * @type {import("../types/parse-interfaces").Post}
 */
const post = new Parse.Object("Post");
post.get("author");
