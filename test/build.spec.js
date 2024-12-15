// import { ParseClassGenerator } from "../dist";
import { TEST_SCHEMA } from "./schema";

describe("Test Build Package", function () {
  it.skip("Test all functionalities", async function () {
    const { ParseClassGenerator } = await import("../dist");
    const generator = new ParseClassGenerator();
    await generator
      .createAttributesFile(TEST_SCHEMA, "types/attributes.d.ts")
      .then(async (attr) => {
        await attr.createDeclarationsFile("types/parse-declarations.d.ts");
        await attr.createTsClassesFile("types/parse-classes.ts");
        await attr.createJsDocFile("types/parse-classes.js");
      });
  });
});
