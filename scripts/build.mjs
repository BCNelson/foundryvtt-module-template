import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import * as esbuild from 'esbuild';
import { transformManifest } from "./common.mjs";

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const moduleFileString = await fs.readFile(path.resolve(projectRoot, "module.json"), "utf-8");

const manifest = await transformManifest(moduleFileString, process.env);

const ret = await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/index.js',
    format: 'esm'
});

await fs.writeFile(path.resolve(projectRoot, "dist/module.json"), manifest);