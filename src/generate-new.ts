import * as fs from "fs";
import * as path from "path";
import Parse from "parse/node";
import prettier from "prettier";
import { getRelativeImportPath, saveToFile } from "./functions";

interface SchemaDetails {
  type: string;
  targetClass?: string;
  required?: boolean;
  defaultValue?: string;
}

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
    constructor(attrs = {}) {
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
    constructor(attrs:${newName}Attributes = {}) {
      super("${newName}", {...${newName}.DEFAULT_VALUES, ...attrs});
    }
    `;
  }

  private getPointerType(details: SchemaDetails) {
    if (!details.targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    const baseClass = getBaseClass(details.targetClass);
    const targetClassName = this.getTargetClassName(details.targetClass);

    if (isBuiltIn(details.targetClass)) {
      if (this.builtInNames[details.targetClass]) {
        return `${baseClass}<${targetClassName}Attributes> | null`;
      } else {
        return `${baseClass} | null`;
      }
    } else {
      return `${baseClass}<${targetClassName}Attributes> | null`;
    }
  }

  private getRelationType(className: string, details: SchemaDetails) {
    if (!details.targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    const thisClassName = this.getTargetClassName(className);
    const targetClassName = this.getTargetClassName(details.targetClass);
    return `Parse.Relation<${thisClassName}, ${targetClassName}> | null`;
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
          type = this.getPointerType(details);
          break;
        case "Relation":
          type = this.getRelationType(schema.className, details);
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

      if (type.includes(" | null") && optional) {
        type = type.replace(" | null", "");
      }
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
        classesfilepath: string,
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

        const envMap = {
          node: "parse/node",
          browser: "parse",
          "react-native": "parse/react-native",
        };

        const parseImport = `import Parse from "${envMap[env]}"`;

        debugger;
        const attrsRelativePath = getRelativeImportPath(
          classesfilepath,
          attributesFilePath
        );
        const attrsImport = `import { ${classes
          .map((c) => c.className + "Attributes")
          .join(", ")} } from "${attrsRelativePath}";`;
        const output = `${parseImport}\n
        ${attrsImport}\n\n
        ${classDefs.join("\n")}
        export const registerAll = ()=>{${toRegister.join("\n")}};\n
        export { ${toExport.join(", ")} };
        `;
        const pretty = await prettier.format(output, { parser: "typescript" });
        saveToFile(classesfilepath, pretty);
      },
      createJsDocFile: async () => {},
    };
  }

  //   /**
  //    * create typescript file containing class defintions
  //    * @param schemas your Parse schema
  //    * @param filePath path to the output file
  //    * @param env usage environment of decleration file.
  //    *  determines the `import` statement at the top of the file.
  //    */
  //   async createTsFile(
  //     schemas: ReadonlyArray<Parse.RestSchema>,
  //     filePath: string = path.join(__dirname, "parse-classes.ts"),
  //     env: "node" | "browser" | "react-native" = "node"
  //   ) {
  //     const toExport: string[] = [];
  //     const toRegister: string[] = [];

  //     const classDefinitions = schemas.map((schema) => {
  //       const def = this.generateClass(schema);
  //       if (def) {
  //         toExport.push(def.className);
  //         const baseClass = getBaseClass(schema.className);
  //         toRegister.push(
  //           `${baseClass}.registerSubclass("${def.className}",${def.className});`
  //         );
  //         return `
  //       class ${def?.className} extends ${baseClass}<${def.attributes}> {
  //       static DEFAULT_VALUES = {
  //         ${def.defaultValues}
  //       };

  //       ${this.createConstructor(schema)}
  //       }
  //     `;
  //       } else {
  //         return null;
  //       }
  //     });
  //     const helperTypes = fs.readFileSync(
  //       path.join(__dirname, "types.d.ts"),
  //       "utf8"
  //     );

  //     const envMap = {
  //       node: "parse/node",
  //       browser: "parse",
  //       "react-native": "parse/react-native",
  //     };

  //     const parseImport = `import Parse from "${envMap[env]}"`;

  //     const output = `${parseImport}\n\n
  //     ${helperTypes}\n\n
  //     ${classDefinitions.join("\n")}
  //     export const registerAll = ()=>{${toRegister.join("\n")}};\n
  //     export { ${toExport.join(", ")} };
  // `;

  //     const pretty = await prettier.format(output, { parser: "typescript" });
  //     const directory = path.parse(filePath).dir;

  //     ensureDir(directory);
  //     fs.writeFileSync(filePath, pretty);
  //   }
}
