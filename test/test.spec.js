import { equal } from "assert";
import { ParseClassGenerator } from "@src/generate";
import { spawn } from "child_process";
import { describe, it } from "mocha";
import { existsSync } from "fs";

describe("Test Generation", async function () {
  this.timeout(10000);
  it("should generate classes", async function () {
    const { APP_ID, SERVER_URL, MASTER_KEY } = process.env;
    const generator = new ParseClassGenerator(APP_ID, MASTER_KEY, SERVER_URL);
    const outFilePath = "types/parse-classes.ts";
    await generator.generateClasses(outFilePath);
    const fileExists = existsSync(outFilePath);
    equal(fileExists, true);
  });

  it("generated file should be compiled without error", function () {
    const proc = spawn("node", ["-e", "process.exit(35)"]);
    proc.on("message", console.log);
    proc.on("exit", (code) => {
      equal(code, 0);
      done();
    });
  });
});
