# parse-class-generator

[![npm version](https://badge.fury.io/js/parse-class-generator.svg)](https://badge.fury.io/js/parse-class-generator)

Generate Typescript class defintions and declaration files for your Parse project. this package automatically creates the required files to develop your application with Javascript/Typescript in a type-safe manner, and also get code completion.

## Installation

To install the package via npm:

```bash
npm install --save-dev parse-class-generator
```

Or using Yarn:

```bash
yarn add parse-class-generator --dev
```

## Usage

```javascript
// Import the package
const { ParseClassGenerator } = require("parse-class-generator");

// Example usage
const Parse = require("parse/node");

const createTypes = async () => {
  Parse.initialize("myAppId", undefined, "myMasterKey");
  Parse.serverURL = "XXXXXXXXXXXXXXXXXXXXXXXXXXX";
  const schemas = await Parse.Schema.all();

  const generator = new ParseClassGenerator();
  await generator.createTsFile(schemas, "./src/parse/classes", "node");
};

createTypes().then(() => {
  console.log("created parse classes");
});
```

For an easy start, add the script above to a js file and assign a script to execute it inside `package.json` file.

## Example Schema

```json
[
  {
    "className": "Post",
    "fields": {
      "title": {
        "type": "String",
      },
      "content": {
        "type": "String",
      "},"
      "author": {
        "type": "Pointer",
        "targetClass": "_User",
      },
      "tags": {
        "type": "Array",
      },
      "publishDate": {
        "type": "Date",
      },
    },
    "classLevelPermissions": {},
  },
  {
    "className": "Comment",
    "fields": {
      "content": {
        "type": "String",
      },
      "post": {
        "type": "Pointer",
        "targetClass": "Post",
      },
      "author": {
        "type": "Pointer",
        "targetClass": "_User",
      },
      "details": {
        "type": "Object",
      },
    },
    "classLevelPermissions": {},
  },
];
```

```typescript
import Parse from "parse/node";

export type Primitive =
  | undefined
  | null
  | boolean
  | number
  | symbol
  | string
  | Date;

export type Serializable = Primitive | SerializableObject | SerializableArray;

export type SerializableArray = ReadonlyArray<Serializable>;

export type SerializableObject = Readonly<{ [key: string]: Serializable }>;

class Post extends Parse.Object<{
  title?: string;
  content?: string;
  author?: Parse.User;
  tags?: SerializableArray;
  publishDate?: Date;
}> {
  static DEFAULT_VALUES = {};

  constructor() {
    super("Post", Post.DEFAULT_VALUES);
  }
}

class Comment extends Parse.Object<{
  content?: string;
  post?: Post;
  author?: Parse.User;
  details?: SerializableObject;
}> {
  static DEFAULT_VALUES = {};

  constructor() {
    super("Comment", Comment.DEFAULT_VALUES);
  }
}

export const registerAll = () => {
  Parse.Object.registerSubclass("Post", Post);
  Parse.Object.registerSubclass("Comment", Comment);
};

export { Post, Comment };
```

- Some utility types are added for better typing of `Array` and `Object` fields.
- a `registerAll` function is also exported for convenience. Use it before `Parse.initialize` to register all sub-classes.

## API

```typescript
class ParseClassGenerator {
  constructor(modifiedClasses?: BuiltInClassParams);

  generateClass(schema: Parse.RestSchema): string | null;

  createTsFile(
    schemas: ReadonlyArray<Parse.RestSchema>,
    filePath?: string,
    env?: "node" | "browser" | "react-native"
  ): Promise<void>;
}
```

`constructor`: Create an instance of generator class.

- `modifiedClasses`: Indicates which built-in classes are modified.

  - only provide this argument when you have modified built-in Parse classes. (User, Role, Session)

  ***

`generateClass`: Create class definition for a single class schema

- `schema`: a Parse class schema object
- **Returns**: a string of class definitions or null (for built-in classes if not specified in the constructor)
- ### Note: The output string is NOT prettified.

  ***

`createTsFile`: create typescript file containing class defintions

- `schemas`: an array of `Parse.RestSchema`
- `filePath`: the output `.ts` file path
- `env`: usage environment of decleration file.
  - determines the `import` statement at the top of the file.

## Examples

```javascript
// Example of modified built-in classes
const generator = new ParseClassGenerator({
  _User: "CustomUser",
  _Role: true,
  _Session: false,
});
```

- the modified Parse.User class will be in the output file and its name will be `CustomUser`
- the modified Parse.Role class will be in the output file and its name will be `_Role`
- This class is not modified and won't be in the output file. you can also omit this key instead of setting it to `false`

## Contributing

To contribute to this package:

```bash
# Clone the repository and install dependencies
git clone https://github.com/alino20/parse-class-generator.git
cd parse-class-generator
npm install
```

Feel free to open issues and submit pull requests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Ali Nosrati**  
[GitHub Profile](https://github.com/alino20)
