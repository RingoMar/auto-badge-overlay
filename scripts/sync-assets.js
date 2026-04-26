const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const files = ["index.html", "badge-game.js", "robots.txt", "_headers"];

fs.mkdirSync(publicDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(rootDir, file), path.join(publicDir, file));
}

console.log(`Synced ${files.join(", ")} to public/`);
