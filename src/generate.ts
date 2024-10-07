import * as fs from "fs";
import * as path from "path";
import Parse from "parse/node";
import prettier from "prettier";

/**
 * Recursively create a directory at the given `path`.
 *
 * @param {String} path
 */
function ensureDir(path: string) {
  fs.mkdirSync(path, { recursive: true });
}

// Static default values for each field type
const DEFAULT_VALUES: Record<string, any> = {
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

async function fetchSchemas(): Promise<Parse.RestSchema[]> {
  const schemas = await Parse.Schema.all();
  return schemas;
}

/**
 * Generates a TypeScript class from a Parse schema.
 */
export class ParseClassGenerator {
  appId: string;
  masterKey: string;
  serverUrl: string;
  builtInNames: Partial<Record<ParseUnionType, string>> = {};

  /**
   *
   * @param appId Parse Server App ID
   * @param masterKey Parse Server Master Key
   * @param serverUrl Parse Server URL
   * @param modifiedClasses an object to determine modified built-in classes
   */
  constructor(
    appId: string,
    masterKey: string,
    serverUrl: string,
    modifiedClasses?: BuiltInClassParams
  ) {
    this.appId = appId;
    this.masterKey = masterKey;
    this.serverUrl = serverUrl;

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
    constructor() {
      super(${newName}.DEFAULT_VALUES);
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
    constructor() {
      super("${newName}", ${className}.DEFAULT_VALUES);
    }
    `;
  }

  private getPointerType(details: {
    type: string;
    targetClass?: string;
    required?: boolean;
    defaultValue?: string;
  }) {
    if (!details.targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    const targetClassName = this.getTargetClassName(details.targetClass);

    return `${targetClassName} | null`;
  }

  private getRelationType(details: {
    type: string;
    targetClass?: string;
    required?: boolean;
    defaultValue?: string;
  }) {
    if (!details.targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    const targetClassName = this.getTargetClassName(details.targetClass);
    return `Parse.Relation<${targetClassName}> | null`;
  }

  generateClass(schema: Parse.RestSchema): string | null {
    const className = schema.className;

    if (isBuiltIn(className) && !(className in this.builtInNames)) {
      return null;
    }

    // Use base class from the dictionary or default to Parse.Object
    const baseClass = getBaseClass(className);

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
          type = this.getRelationType(details);
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
        default:
          console.warn("Type not found:", details.type);
          type = "any";
      }

      const optional = details.required ? "" : "?";
      props.push(`${name}${optional}: ${type};`);

      if (details.required) {
        let defaultValue: string | number | boolean;
        if (details.type === "String") {
          defaultValue = `"${details.defaultValue ?? ""}"`;
        } else if (details.type === "GeoPoint") {
          defaultValue = `new Parse.GeoPoint(0, 0)`;
        } else {
          defaultValue = details.defaultValue ?? DEFAULT_VALUES[details.type];
        }
        defaultValues.push(`${name}: ${defaultValue}`);
      }
    }

    const newName = this.getTargetClassName(className);

    return `
    class ${newName} extends ${baseClass}<{\n${props.join("\n")}}> {
    static DEFAULT_VALUES = {
      ${defaultValues.join(",\n")}
    };
    
    ${this.createConstructor(schema)}
    }
  `;
  }

  /**
   *
   * @param filePath path to generated typescript file
   */
  async generateClasses(
    filePath: string = path.join(__dirname, "ParseClasses.ts")
  ) {
    if (!this.appId || !this.masterKey || !this.serverUrl) {
      throw new Error(
        "Missing required parameters: appId, masterKey, serverUrl"
      );
    }
    // Initialize Parse with environment variables
    Parse.initialize(this.appId);
    Parse.masterKey = this.masterKey;
    Parse.serverURL = this.serverUrl;

    const schemas = await fetchSchemas();

    const toExport: string[] = [];
    const toRegister: string[] = [];

    const classDefinitions: string[] = schemas
      .map((schema) => {
        const def = this.generateClass(schema);
        if (def) {
          const targetClassName = this.getTargetClassName(schema.className);
          toExport.push(targetClassName);
          const baseClass = getBaseClass(schema.className);
          toRegister.push(
            `${baseClass}.registerSubclass("${targetClassName}",${targetClassName});`
          );
        }
        return def;
      })
      .filter(Boolean) as string[];

    const helperTypes = fs.readFileSync(
      path.join(__dirname, "types.d.ts"),
      "utf8"
    );

    const parseImport = "import Parse from 'parse'";

    const output = `${parseImport}\n\n
    ${helperTypes}\n\n
    ${classDefinitions.join("\n")}
    export const registerAll = ()=>{${toRegister.join("\n")}};\n
    export { ${toExport.join(", ")} };
`;

    const pretty = await prettier.format(output, { parser: "typescript" });
    const directory = path.parse(filePath).dir;

    ensureDir(directory);
    fs.writeFileSync(filePath, pretty);
  }
}
