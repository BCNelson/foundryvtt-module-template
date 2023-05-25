import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import * as esbuild from 'esbuild';
import { transformManifest } from "./common.mjs";

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const moduleFileString = await fs.readFile(path.resolve(projectRoot, "module.json"), "utf-8");

const moduleManifestContents = await transformManifest(moduleFileString, process.env);
const moduleManifest = JSON.parse(moduleManifestContents);

const outdir = path.resolve(projectRoot, `./tmp/foundry/Data/modules/${moduleManifest.name}`);
await fs.mkdir(outdir, { recursive: true });

fs.writeFile(path.resolve(outdir, "module.json"), moduleManifestContents);

const watcher = fs.watch(path.resolve(projectRoot, "module.json"), { encoding: 'utf-8' });

for await (const event of watcher) {
    console.log('module.json changed', event);
    const moduleFileString = await fs.readFile(path.resolve(projectRoot, "module.json"), "utf-8");
    const moduleManifestContents = await transformManifest(moduleFileString, process.env);
    fs.writeFile(path.resolve(outdir, "module.json"), moduleManifestContents);
}

const ctx = await esbuild.context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outdir,
    format: 'esm'
});

await ctx.watch();
console.log("Watching for changes");

process.on("SIGINT", () => {
    console.log("SIGINT Recived cleaning up");
    ctx.dispose();
    process.exit();
})