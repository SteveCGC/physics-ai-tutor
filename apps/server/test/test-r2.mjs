// test-r2.mjs
import { AwsClient } from "aws4fetch";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// 从 .dev.vars 读取配置
const __dirname = dirname(fileURLToPath(import.meta.url));
const devVars = readFileSync(resolve(__dirname, "../.dev.vars"), "utf-8");
const env = Object.fromEntries(
  devVars
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("="))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k.trim(), v.join("=").trim()])
);

const r2 = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: "s3",
});

const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const res = await r2.fetch(`${endpoint}/`);
console.log("Status:", res.status);
console.log("Response:", await res.text());
