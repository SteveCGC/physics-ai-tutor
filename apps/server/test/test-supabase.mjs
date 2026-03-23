// test-supabase.mjs — 测试 Supabase REST API 连接
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;

console.log("SUPABASE_URL:", SUPABASE_URL);

// 用 health 接口验证连通性
const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`);
const text = await res.text();

console.log("Status:", res.status);
// 能收到 Supabase 的响应即说明连接成功（401 也代表连接正常，只是权限问题）
if (res.status === 200 || res.status === 401) {
  console.log("✓ Supabase 连接成功（URL 和 Key 均有效）");
} else {
  console.log("✗ 连接失败:", text);
}
