import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env");

dotenv.config({ path: envPath, quiet: true });
