import * as fs from "fs";
import * as path from "path";
import Parse from "parse/node";
import prettier from "prettier";
import { getRelativeImportPath, saveToFile } from "./functions";

// Static default values for each field type
const DEFAULT_VALUES: Record<string, unknown> = {
  Number: 0,
  String: "",
  Boolean: false,
  Date: new Date(),
  Pointer: null,
  Array: [],
  Object: {},
  File: null,
  GeoPoint: new Parse.GeoPoint(0, 0),
};

const ENV_MAP = {
  node: "parse/node",
  browser: "parse",
  "react-native": "parse/react-native",
};

const PARSE_CLASSES = ["_User", "_Role", "_Session"] as const;

type ParseUnionType = (typeof PARSE_CLASSES)[number]; // "_User" | "_Role" | "_Session"

// Base class dictionary
const BASE_CLASSES: Readonly<Record<ParseUnionType, string>> = {
  _User: "Parse.User",
  _Role: "Parse.Role",
  _Session: "Parse.Session",
};

type BuiltInClassParams = Record<ParseUnionType, string | boolean>;

const isBuiltIn = (className: string): className is ParseUnionType => {
  return (PARSE_CLASSES as readonly string[]).includes(className);
};

const getBaseClass = (className: string): string => {
  return isBuiltIn(className)
    ? BASE_CLASSES[className as ParseUnionType]
    : "Parse.Object";
};

/**
 * Generator class used for creating definition files.
 */
export class ParseClassGenerator {
  builtInNames: Partial<Record<ParseUnionType, string>> = {};

  /**
   * Create an instance of generator class
   * @param modifiedClasses Indicates which built-in classes are modified.
   *  only provide this argument when you have modified built-in Parse classes. (User, Role, Session)
   * @returns
   */
  constructor(modifiedClasses?: BuiltInClassParams) {
    if (!modifiedClasses) return this;

    PARSE_CLASSES.forEach((key) => {
      if (modifiedClasses[key]) {
        if (typeof modifiedClasses[key] === "string") {
          this.builtInNames[key] = modifiedClasses[key];
        } else {
          this.builtInNames[key] = key;
        }
      }
    });
  }

  private getTargetClassName(className: string): string {
    if (className in this.builtInNames) {
      return this.builtInNames[className as ParseUnionType] as string;
    } else if (isBuiltIn(className)) {
      return BASE_CLASSES[className];
    } else {
      return className;
    }
  }

  private createConstructor(schema: Parse.RestSchema): string {
    const className = schema.className;
    const newName = this.getTargetClassName(className);

    if (className === "_User") {
      return `
    constructor(attrs: Partial<${newName}Attributes> = {}) {
      super({...${newName}.DEFAULT_VALUES, ...attrs});
    }
    `;
    }

    if (className === "_Role") {
      return `
    constructor(ACL: Parse.ACL = new Parse.ACL()) {
      super("${newName}", ACL);
    }
    `;
    }

    if (className === "_Session") {
      return `
    constructor() {
      super(${newName}.DEFAULT_VALUES);
    }
    `;
    }

    return `
    constructor(attrs: Partial<${newName}Attributes> = {}) {
      super("${newName}", {...${newName}.DEFAULT_VALUES, ...attrs});
    }
    `;
  }

  private getPointerType(targetClass?: string) {
    if (!targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    const baseClass = getBaseClass(targetClass);
    const targetClassName = this.getTargetClassName(targetClass);

    if (isBuiltIn(targetClass)) {
      if (this.builtInNames[targetClass]) {
        return `${baseClass}<${targetClassName}Attributes> | null`;
      } else {
        return `${baseClass} | null`;
      }
    } else {
      return `${baseClass}<${targetClassName}Attributes> | null`;
    }
  }

  private getRelationType(className: string, targetClass?: string) {
    if (!targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    const t1 = this.getPointerType(className).replace(" | null", "");
    const t2 = this.getPointerType(targetClass).replace(" | null", "");

    return `Parse.Relation<${t1}, ${t2}> | null`;
  }

  generateAttributes(schema: Parse.RestSchema): {
    attributes: string[];
    defaultValues: string[];
  } {
    const attributes = schema.fields;
    const props: string[] = [];
    const defaultValues: string[] = [];

    for (const [name, details] of Object.entries(attributes)) {
      if (name === "ACL" || name === "createdAt" || name === "updatedAt") {
        continue; // Skip common fields
      }

      let type: string;
      switch (details.type) {
        case "Number":
          type = "number";
          break;
        case "String":
          type = "string";
          break;
        case "Boolean":
          type = "boolean";
          break;
        case "Date":
          type = "Date";
          break;
        case "Pointer":
          type = this.getPointerType(details.targetClass);
          break;
        case "Relation":
          type = this.getRelationType(schema.className, details.targetClass);
          break;
        case "Array":
          type = "SerializableArray";
          break;
        case "Object":
          type = "SerializableObject";
          break;
        case "File":
          type = "Parse.File | null";
          break;
        case "GeoPoint":
          type = "Parse.GeoPoint";
          break;
        case "Polygon":
          type = "Parse.Polygon";
          break;
        default:
          console.warn("Type not found:", details.type);
          type = "any";
      }

      const optional = details.required ? "" : "?";

      // if (type.includes(" | null") && optional) {
      //   type = type.replace(" | null", "");
      // }
      props.push(`${name}${optional}: ${type};`);

      if (details.required) {
        let defaultValue: string | number | boolean;
        if (details.type === "String") {
          defaultValue = `"${details.defaultValue ?? ""}"`;
        } else if (details.type === "GeoPoint") {
          defaultValue = `new Parse.GeoPoint(0, 0)`;
        } else {
          defaultValue =
            details.defaultValue ??
            (DEFAULT_VALUES[details.type] as string | boolean | number);
        }
        defaultValues.push(`${name}: ${defaultValue}`);
      }
    }

    return {
      attributes: props,
      defaultValues: defaultValues,
    };
  }

  /**
   * Create class definition for a single class schema
   * @param schema a Parse class schema object
   * @returns a string of class definitions or null (for built-in classes if not specified in the constructor)
   */
  generateClass(schema: Parse.RestSchema): {
    attributes: string[];
    constructor: string;
    defaultValues: string[];
    className: string;
  } | null {
    const className = schema.className;

    if (isBuiltIn(className) && !(className in this.builtInNames)) {
      return null;
    }

    const newName = this.getTargetClassName(className);

    const { attributes, defaultValues } = this.generateAttributes(schema);

    return {
      attributes: attributes,
      constructor: this.createConstructor(schema),
      defaultValues: defaultValues,
      className: newName,
    };
  }

  async createAttributesFile(
    schemas: Parse.RestSchema[],
    filePath: string = path.join(__dirname, "parse-class-attributes.d.ts")
  ) {
    const helperTypes = fs.readFileSync(
      path.join(__dirname, "types.d.ts"),
      "utf8"
    );

    const classes = schemas
      .map((schema) => this.generateClass(schema))
      .filter((def) => def !== null);

    const attributesContent = classes
      .map((classData) => {
        const { attributes } = classData;
        return `export interface ${classData.className}Attributes {\n${attributes.join(
          "\n"
        )}\n}`;
      })
      .join("\n");

    const output = `${helperTypes}\n\n${attributesContent}\n`;

    const pretty = await prettier.format(output, { parser: "typescript" });
    saveToFile(filePath, pretty);

    const attributesFilePath = filePath;

    return {
      createTsClassesFile: async (
        classesFilepath: string,
        env: "node" | "browser" | "react-native" = "node"
      ) => {
        const toExport: string[] = [];
        const toRegister: string[] = [];
        const classDefs: string[] = [];

        classes.forEach((classData) => {
          const { constructor, defaultValues, className } = classData;

          toExport.push(className);

          const baseClass = getBaseClass(className);
          toRegister.push(
            `${baseClass}.registerSubclass("${className}",${className});`
          );

          const def = `class ${className} extends ${baseClass}<${className}Attributes> {
          static DEFAULT_VALUES = {
            ${defaultValues.join(",\n")}
          };
          ${constructor}
          }`;

          classDefs.push(def);
        });

        const parseImport = `import Parse from "${ENV_MAP[env]}"`;

        const attrsRelativePath = getRelativeImportPath(
          classesFilepath,
          attributesFilePath
        );
        const attrsImport = `import { ${classes
          .map((c) => c.className + "Attributes")
          .join(", ")} } from "${attrsRelativePath}";`;
        const output = `${parseImport}\n
        ${attrsImport}\n\n
        ${classDefs.join("\n")}
        export { ${toExport.join(", ")} };
        `;
        const pretty = await prettier.format(output, { parser: "typescript" });
        saveToFile(classesFilepath, pretty);
      },
      createDeclarationsFile: async (
        declarationFilepath: string
        // env: "node" | "browser" | "react-native" = "node"
      ) => {
        const interfaces: string[] = [];
        const toExport: string[] = [];

        classes.forEach((classData) => {
          const { className } = classData;
          const baseClass = getBaseClass(className);

          const def = `interface ${className} extends ${baseClass}<${className}Attributes> {}`;
          interfaces.push(def);
          toExport.push(className);
        });

        const attrsRelativePath = getRelativeImportPath(
          declarationFilepath,
          attributesFilePath
        );

        const attrsImport = `import { ${classes
          .map((c) => c.className + "Attributes")
          .join(", ")} } from "${attrsRelativePath}";`;
        const output = `${attrsImport}\n\n
        ${interfaces.join("\n")}
        export { ${toExport.join(", ")} };
        `;
        const pretty = await prettier.format(output, { parser: "typescript" });
        saveToFile(declarationFilepath, pretty);
      },
      createJsDocFile: async (
        jsDocFilepath: string,
        env: "node" | "browser" | "react-native" = "node"
      ) => {
        const attrsRelativePath = getRelativeImportPath(
          jsDocFilepath,
          attributesFilePath
        );

        const typeDefs: string[] = [];

        classes.forEach((classData) => {
          const { className } = classData;
          const baseClass = getBaseClass(className);

          const def = `* @typedef {${baseClass}<Partial<import("${attrsRelativePath}").${className}Attributes>>} ${className}`;
          typeDefs.push(def);
        });

        const parseImport = `import Parse from "${ENV_MAP[env]}"`;

        const output = `
        ${parseImport}\n
        /**
        ${typeDefs.join("\n")}
        */
       
        export {};
        `;

        const pretty = await prettier.format(output, { parser: "typescript" });
        saveToFile(jsDocFilepath, pretty);
      },
    };
  }
}
