module.exports = {
  diff: true,
  extension: ["js", "cjs", "mjs"],
  package: "./package.json",
  reporter: "spec",
  slow: "75",
  timeout: "2000",
  require: ["ts-node/register", "tsconfig-paths/register", "dotenv/config"],
  recursive: true,
  globals: ["Parse"],
  extensions: ["ts", "js"],
  exit: true,
  // delay: true,
  "check-leaks": true,
  sort: true,
  spec: ["test/**/*.spec.js"],

  // 'watch-files': ['test/**/*.spec.js'],
};
