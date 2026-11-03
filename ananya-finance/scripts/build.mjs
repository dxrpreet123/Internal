// Wraps src/app.html (written as page content, the way Claude artifacts expect it)
// into a full HTML document at public/index.html for Vercel or any static host.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const src = await readFile(new URL("src/app.html", root), "utf8");

// Move the leading <title>, <meta> and <style> blocks into <head>.
const lead = /^\s*(<title>[\s\S]*?<\/title>|<meta\b[^>]*>|<style>[\s\S]*?<\/style>)/;
const head = [];
let rest = src;
for (let m = rest.match(lead); m; m = rest.match(lead)) {
  head.push(m[1]);
  rest = rest.slice(m[0].length);
}
const headTags = head.filter((tag) => !tag.includes("claude:viewport-fit-sides"));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="A three-stage money plan for a PhD stipend: Safety Fund, compounding SIPs, and goals with credit-building.">
<meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Ananya's Finance">
${headTags.join("\n")}
</head>
<body>
${rest.trim()}
</body>
</html>
`;

await mkdir(new URL("public/", root), { recursive: true });
await writeFile(new URL("public/index.html", root), html);
console.log(`Built public/index.html (${(html.length / 1024).toFixed(1)} KB)`);
