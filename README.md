# parse-class-generator

[![npm version](https://badge.fury.io/js/parse-class-generator.svg)](https://badge.fury.io/js/parse-class-generator)

Generate Typescript class definitions and declaration files for your Parse project. this package automatically creates the required files to develop your application with Javascript/Typescript in a type-safe manner, and also get code completion.

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
  await generator
    /* Create a file defining each class attributes */
    .createAttributesFile(schemas, "types/attributes.d.ts")
    .then(async (attr) => {
      /* Create declaration file containing only interfaces*/
      await attr.createDeclarationsFile("types/parse-declarations.d.ts");
      /* Create a typescript file with ParseObject classes */
      await attr.createTsClassesFile("types/parse-classes.ts");
      /* Create a JSDoc file */
      await attr.createJsDocFile("types/parse-classes.js");
    });
};

createTypes().then(() => {
  console.log("created parse definitions");
});
```

For an easy start, add the script above to a js file and assign a script to execute it inside `package.json` file.

### Example Schema

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
    "classLevelPermissions": {}
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
    "classLevelPermissions": {}
  }
]
```

### Example of generated attributes file

```typescript
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

export interface PostAttributes {
  title?: string;
  content?: string;
  author?: Parse.User | null;
  tags?: SerializableArray;
  publishDate?: Date;
  editors?: Parse.Relation<Parse.Object<PostAttributes>, Parse.User> | null;
}
export interface CommentAttributes {
  text: string;
  post: Parse.Object<PostAttributes> | null;
  author?: Parse.User | null;
  details?: SerializableObject;
}
```

- Some utility types are added for better typing of `Array` and `Object` fields.

### Example of generated declaration file

```typescript
import { PostAttributes, CommentAttributes } from "./attributes";

interface Post extends Parse.Object<PostAttributes> {}

interface Comment extends Parse.Object<CommentAttributes> {}
export { Post, Comment };
```

### Example of generated classes

```typescript
import Parse from "parse/node";

import { PostAttributes, CommentAttributes } from "./attributes";

class Post extends Parse.Object<PostAttributes> {
  static DEFAULT_VALUES = {};

  constructor(attrs: Partial<PostAttributes> = {}) {
    super("Post", { ...Post.DEFAULT_VALUES, ...attrs });
  }
}
class Comment extends Parse.Object<CommentAttributes> {
  static DEFAULT_VALUES = {
    text: "",
    post: null,
  };

  constructor(attrs: Partial<CommentAttributes> = {}) {
    super("Comment", { ...Comment.DEFAULT_VALUES, ...attrs });
  }
}
export const registerAll = () => {
  Parse.Object.registerSubclass("Post", Post);
  Parse.Object.registerSubclass("Comment", Comment);
};

export { Post, Comment };
```

- a `registerAll` function is also exported for convenience. Use it before `Parse.initialize` to register all sub-classes.

### Example of generated JSDoc file

```javascript
import Parse from "parse/node";

/**
 * @typedef {Parse.Object<Partial<import("./attributes").PostAttributes>>} Post
 * @typedef {Parse.Object<Partial<import("./attributes").CommentAttributes>>} Comment
 */

export {};
```

## API

```typescript
class ParseClassGenerator {
  constructor(modifiedClasses?: BuiltInClassParams);

  generateClass(schema: Parse.RestSchema): string | null;

  createAttributesFile(
    schemas: ReadonlyArray<Parse.RestSchema>,
    filePath?: string
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

`createAttributesFile`: create a typescript file containing attributes of each Parse class

- `schemas`: an array of `Parse.RestSchema`
- `filePath`: the output `.ts` file path
- **Returns** An object with the following functions:
  - `createDeclarationsFile` to create a file with interfaces only.
  - `createTsClassesFile` to create a file with classes that can be instantiated.
  - `createJsDocFile` to create a JavaScript file with JSDoc definition of classes.

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
