require("dotenv").config();
const ParseClassGenerator = require("../dist/generate").ParseClassGenerator;

const { APP_ID, MASTER_KEY, SERVER_URL } = process.env;

let filePath = "types/classes.ts";

// Basic Usage

const basicGenerator = new ParseClassGenerator(APP_ID, MASTER_KEY, SERVER_URL);
basicGenerator.generateClasses(filePath).then(() => {
  console.log(`Generated TypeScript classes at ${filePath}`);
});

// Advanced Usage, in case you modified Parse Built-in classes, eg: User, Role, Session

const advancedGenerator = new ParseClassGenerator(
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  {
    _Role: true, // Role Class Name Defaults to '_Role'
    _User: "CustomUser", // User class Name will be 'CustomUser'
    _Session: false, // Will not be included in class declerations
  }
);

filePath = "types/modified-classes.ts";

advancedGenerator.generateClasses(filePath).then(() => {
  console.log(`Generated TypeScript classes at ${filePath}`);
});
