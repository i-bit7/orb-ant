import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const connectors = new ReplitConnectors();
const OWNER = "i-bit7";
const REPO = "orb-ant";

async function api(path, opts = {}) {
  const res = await connectors.proxy("github", path, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const ref = await api(`/repos/${OWNER}/${REPO}/git/refs/heads/main`);
const parentSha = ref.object.sha;
console.log("Parent:", parentSha);

const files = execSync("git ls-tree -r --long HEAD", { encoding: "utf-8" })
  .trim().split("\n")
  .map(line => {
    const m = line.match(/^(\d+) (\w+) ([0-9a-f]+)\s+(\d+)\t(.+)$/);
    return m ? { mode: m[1], type: m[2], sha: m[3], size: parseInt(m[4]), path: m[5] } : null;
  })
  .filter(f => f && f.type === "blob");

console.log(`Files: ${files.length}`);

const treeEntries = [];
let blobsDone = 0;
const largeFiles = files.filter(f => f.size > 80000);
for (const file of files) {
  const buf = readFileSync(file.path);
  if (file.size > 80000) {
    const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: buf.toString("base64"), encoding: "base64" }),
    });
    treeEntries.push({ path: file.path, mode: file.mode, type: "blob", sha: blob.sha });
    blobsDone++;
    process.stdout.write(`\r  Blobs: ${blobsDone}/${largeFiles.length}`);
  } else {
    treeEntries.push({ path: file.path, mode: file.mode, type: "blob", content: buf.toString("utf-8") });
  }
}
console.log("\nCreating tree...");
const tree = await api(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tree: treeEntries }),
});
console.log("Tree:", tree.sha);

const commitMsg = execSync("git log -1 --pretty=%s", { encoding: "utf-8" }).trim();
const authorName = execSync("git log -1 --pretty=%an", { encoding: "utf-8" }).trim() || "ORB ANT";
const authorEmail = execSync("git log -1 --pretty=%ae", { encoding: "utf-8" }).trim() || "agent@replit.com";
const authorDate = execSync("git log -1 --pretty=%aI", { encoding: "utf-8" }).trim();

const commit = await api(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: commitMsg,
    tree: tree.sha,
    parents: [parentSha],
    author: { name: authorName, email: authorEmail, date: authorDate },
  }),
});
console.log("Commit:", commit.sha);

await api(`/repos/${OWNER}/${REPO}/git/refs/heads/main`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sha: commit.sha, force: true }),
});

console.log(`\n✓ https://github.com/${OWNER}/${REPO}`);
