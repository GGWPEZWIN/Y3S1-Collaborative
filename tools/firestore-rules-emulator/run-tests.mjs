import { copyFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
copyFileSync(resolve(root, "../../firestore.rules"), resolve(root, "firestore.rules"));

const emulatorCache = resolve(root, ".emulator-cache");
const configDir = resolve(root, ".config");
mkdirSync(emulatorCache, { recursive: true });
mkdirSync(configDir, { recursive: true });

const nodeDir = dirname(process.execPath);
const env = {
  ...process.env,
  JAVA_HOME: process.env.JAVA_HOME || "C:\\Program Files\\Java\\jdk-20",
  FIREBASE_EMULATORS_PATH: emulatorCache,
  XDG_CONFIG_HOME: configDir,
};
env.PATH = `${env.JAVA_HOME}\\bin;${nodeDir};${env.PATH || ""}`;

const firebaseJs = resolve(root, "node_modules/firebase-tools/lib/bin/firebase.js");
const suiteCommand = `"${process.execPath}" run-suite.mjs`;
const child = spawn(
  process.execPath,
  [firebaseJs, "emulators:exec", "--only", "firestore", "--project", "demo-module2-rules", suiteCommand],
  {
    cwd: root,
    stdio: "inherit",
    env,
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
