import { equal, strict } from "assert";
import { ParseClassGenerator } from "@src/generate";
import { describe, it } from "mocha";
import { existsSync, rmSync } from "fs";
import path from "path";
import Parse from "parse/node";
import fc from "fast-check";
import { spawnSync } from "child_process";

const { APP_ID, SERVER_URL, MASTER_KEY } = process.env;

/**
 *
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

describe("Test Basic Generation", async function () {
  this.timeout(10000);
  const outFilePath = path.join("types", "parse-classes.ts");

  this.beforeAll(function () {
    if (existsSync(outFilePath)) {
      console.log("Removing existing file");
      rmSync(outFilePath);
    }
  });

  it("should generate classes", async function () {
    const generator = new ParseClassGenerator(APP_ID, MASTER_KEY, SERVER_URL);
    await generator.generateClasses(outFilePath);
    const fileExists = existsSync(outFilePath);
    equal(fileExists, true);
  });

  it("generated file should be compiled without error", function () {
    compile(outFilePath);
  });
});

describe("Test Advanced Generation", async function () {
  this.timeout(10000);
  const outFilePath = path.join("types", "modified-classes.ts");

  this.beforeAll(function () {
    if (existsSync(outFilePath)) {
      console.log("Removing existing file");
      rmSync(outFilePath);
    }
  });

  it("Should generate valid files", function (done) {
    this.timeout(0);
    fc.assert(
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
            // @ts-ignore
            _User: user,
            // @ts-ignore
            _Role: role,
            // @ts-ignore
            _Session: session,
          };
          // console.log("Generating with options", options);
          const generator = new ParseClassGenerator(
            APP_ID,
            MASTER_KEY,
            SERVER_URL,
            options
          );

          const timeInMS = new Date().getTime();

          const uniqueFilePath = outFilePath.replace(".ts", `_${timeInMS}.ts`);

          await generator.generateClasses(uniqueFilePath);
          compile(uniqueFilePath);
          rmSync(uniqueFilePath);
        }
      )
    )
      .then(() => {
        done();
      })
      .catch((err) => {
        console.log(err);
        done(err);
      });
  });
});
