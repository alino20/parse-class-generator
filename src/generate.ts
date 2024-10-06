import * as fs from "fs";
import * as path from "path";
import Parse from "parse/node";
import prettier from "prettier";

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

// Base class dictionary
const BASE_CLASSES: Record<string, string> = {
  _User: "Parse.User",
  _Role: "Parse.Role",
  _Session: "Parse.Session",
};

interface BuiltInClassParams {
  User?: string | boolean;
  Role?: string | boolean;
  Session?: string | boolean;
}

async function fetchSchemas(): Promise<Parse.RestSchema[]> {
  const schemas = await Parse.Schema.all();
  return schemas;
}

function createConstructor(schema: Parse.RestSchema): string {
  const className = schema.className;

  if (className === "_User") {
    return `
  constructor() {
    super(${className}.DEFAULT_VALUES);
  }
  `;
  }

  if (className === "_Role") {
    return `
  constructor(ACL: Parse.ACL = new Parse.ACL()) {
    super("${className}", ACL);
  }
  `;
  }

  if (className === "_Session") {
    return `
  constructor() {
    super(${className}.DEFAULT_VALUES);
  }
  `;
  }

  return `
  constructor() {
    super("${className}", ${className}.DEFAULT_VALUES);
  }
  `;
}

/**
 * Generates a TypeScript class from a Parse schema.
 */
export class ParseClassGenerator {
  appId: string;
  masterKey: string;
  serverUrl: string;

  user: string = "Parse.User";
  role: string = "Parse.Role";
  session: string = "Parse.Session";

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

    if (modifiedClasses?.User) {
      this.user =
        typeof modifiedClasses.User === "string"
          ? modifiedClasses.User
          : "_User";
    }

    if (modifiedClasses?.Role) {
      this.role =
        typeof modifiedClasses.Role === "string"
          ? modifiedClasses.Role
          : "_Role";
    }

    if (modifiedClasses?.Session) {
      this.session =
        typeof modifiedClasses.Session === "string"
          ? modifiedClasses.Session
          : "_Session";
    }
  }

  private getPointerType(details: {
    type: string;
    targetClass?: string;
    required?: boolean;
    defaultValue?: string;
  }) {
    const builtInNames: Record<string, string> = {
      _User: this.user || `Parse.User`,
      _Role: this.role || `Parse.Role`,
      _Session: this.session || `Parse.Session`,
    };

    if (!details.targetClass) {
      throw new Error("Target class is required for Pointer type");
    }

    if (["_User", "_Role", "_Session"].includes(details.targetClass)) {
      const targetClassName = builtInNames[details.targetClass];

      return `${targetClassName} | null`;
    } else {
      return `Parse.Object<${details.targetClass}> | null`;
    }
  }

  generateClass(schema: Parse.RestSchema): string | null {
    const className = schema.className;

    if (className === "_User" && this.user === null) return null;
    if (className === "_Role" && this.role === null) return null;
    if (className === "_Session" && this.session === null) return null;

    // Use base class from the dictionary or default to Parse.Object
    const baseClass = BASE_CLASSES[className] || "Parse.Object";

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
        case "Array":
          type = "any[]";
          break;
        case "Object":
          type = "object";
          break;
        case "File":
          type = "Parse.File | null";
          break;
        case "GeoPoint":
          type = "Parse.GeoPoint";
          break;
        default:
          type = "any";
      }

      const optional = details.required ? "" : "?";
      props.push(`  ${name}${optional}: ${type};`);

      if (details.required) {
        let defaultValue: string | number | boolean;
        if (details.type === "String") {
          defaultValue = `"${details.defaultValue ?? ""}"`;
        } else if (details.type === "GeoPoint") {
          defaultValue = `new Parse.GeoPoint(0, 0)`;
        } else {
          defaultValue = details.defaultValue ?? DEFAULT_VALUES[details.type];
        }
        defaultValues.push(`  ${name}: ${defaultValue}`);
      }
    }

    return `
  class ${className} extends ${baseClass}<{\n${props.join("\n")}}> {
    static DEFAULT_VALUES = {
      ${defaultValues.join(",\n")}
    };
    
    ${createConstructor(schema)}
  }
  `;
  }

  /**
   *
   * @param APP_ID
   * @param SERVER_URL
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

    const classDefinitions: string[] = schemas
      .map((schema) => this.generateClass(schema))
      .filter(Boolean) as string[];

    const output = `
${classDefinitions.join("\n")}
export { ${schemas
      .map((s) => s.className)
      .filter((c) => !BASE_CLASSES[c])
      .join(", ")} };
`;

    const pretty = await prettier.format(output, { parser: "typescript" });

    const outputPath = filePath;
    fs.writeFileSync(outputPath, pretty);

    console.log(`Generated TypeScript classes at ${outputPath}`);
  }
}
