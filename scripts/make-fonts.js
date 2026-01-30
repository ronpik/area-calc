// scripts/make-font.js
const fs = require("fs");
const path = require("path");

const filePath = process.argv[2]; // e.g. src/fonts/Rubik-Regular.ttf
if (!filePath) {
  console.error("Usage: node make-font.js <path-to-ttf>");
  process.exit(1);
}

const absPath = path.resolve(filePath);
const fontData = fs.readFileSync(absPath).toString("base64");
console.log("\nBase64 output for:", absPath);
console.log("\n" + fontData + "\n");