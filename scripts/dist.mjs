// Copies the deployable site (page, styles, bundle, images) into dist/ for static hosting.
import { cpSync, rmSync, mkdirSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const p of ["index.html", "css", "js", "assets"]) cpSync(p, `dist/${p}`, { recursive: true });
console.log("dist/ ready");
