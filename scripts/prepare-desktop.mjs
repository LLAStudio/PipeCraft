import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, dereference: true });
  return true;
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error('Missing .next/standalone/server.js. Run "next build" first.');
}

const staticCopied = copyDirectory(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
);
const publicCopied = copyDirectory(
  path.join(root, "public"),
  path.join(standalone, "public"),
);
const prismaEngineCopied = copyDirectory(
  path.join(root, "node_modules", ".prisma", "client"),
  path.join(standalone, "node_modules", ".prisma", "client"),
);

if (!fs.existsSync(path.join(standalone, "node_modules", "@prisma", "client"))) {
  copyDirectory(
    path.join(root, "node_modules", "@prisma", "client"),
    path.join(standalone, "node_modules", "@prisma", "client"),
  );
}

console.log(
  [
    "Desktop server prepared:",
    `.next/static ${staticCopied ? "copied" : "not found"}`,
    `public ${publicCopied ? "copied" : "not found"}`,
    `Prisma engine ${prismaEngineCopied ? "copied" : "not found"}`,
  ].join(" | "),
);
