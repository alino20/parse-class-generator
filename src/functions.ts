import * as fs from "fs";
import * as path from "path";

/**
 * Recursively create a directory at the given `path`.
 *
 * @param {String} path
 */
export function ensureDir(path: string) {
  fs.mkdirSync(path, { recursive: true });
}

export const saveToFile = (filePath: string, content: string) => {
  const directory = path.parse(filePath).dir;
  ensureDir(directory);
  fs.writeFileSync(filePath, content);
};

export const getRelativeImportPath = (from: string, to: string) => {
  let attrsRelativePath = path
    .relative(path.parse(from).dir, to)
    .replace(/\\/g, "/")
    .replace(".d.ts", ".ts")
    .replace(".ts", "");

  if (!attrsRelativePath.startsWith(".")) {
    attrsRelativePath = "./" + attrsRelativePath;
  }
  return attrsRelativePath;
};
