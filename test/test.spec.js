import Parse from "parse/node";
import { equal } from "assert";
import { ParseClassGenerator } from "@src/generate";
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

describe.skip("Test Parse Class Generator", function () {
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
      console.log("ClassName:", schema.className);
      Object.entries(schema.fields).forEach(([key, value]) => {
        console.log("Field:", key, value);
      });
      schemas.push(schema);
    });
  });

  describe("Built-in Classes are not modified", function () {
    const outFilePath = path.join("types", "parse-classes.ts");

    it("Should create valid files", async function () {
      this.timeout(10000);
      const generator = new ParseClassGenerator();
      await generator.createTsFile(schemas, outFilePath, "node");
      const fileExists = existsSync(outFilePath);
      equal(fileExists, true);
      compile(outFilePath);
    });
  });

  describe("test with modified built-in classes", function () {
    const outFilePath = path.join("types", "modified-classes.ts");

    /**
     * @type {Parse.RestSchema[]}
     */
    const builtInSchemas = [];

    this.beforeAll(async function () {
      this.timeout(10000);
      const fetched = await Parse.Schema.all();
      fetched
        .filter((schema) =>
          ["_User", "_Role", "_Session"].includes(schema.className)
        )
        .forEach((schema) => {
          builtInSchemas.push(schema);
        });
    });

    const extendedSchema = schemas.concat(builtInSchemas);

    it("Should generate valid files", async function () {
      this.timeout(0);
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant("CustomUser"),
            fc.boolean(),
            fc.constant(undefined)
          ),
          fc.oneof(
            fc.constant("CustomRole"),
            fc.boolean(),
            fc.constant(undefined)
          ),
          fc.oneof(
            fc.constant("CustomSession"),
            fc.boolean(),
            fc.constant(undefined)
          ),

          async (user, role, session) => {
            const options = {
              _User: user,
              _Role: role,
              _Session: session,
            };
            // console.log("Generating with options", options);
            const generator = new ParseClassGenerator(options);

            const timeInMS = new Date().getTime();

            const uniqueFilePath = outFilePath.replace(
              ".ts",
              `_${timeInMS}.ts`
            );

            await generator.createTsFile(extendedSchema, uniqueFilePath);
            compile(uniqueFilePath);
            rmSync(uniqueFilePath);
          }
        )
      );
    });
  });
});
