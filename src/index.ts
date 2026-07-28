/**
 * pi-til-done Override Plugin
 * ─────────────────────────────
 * Patches MAX_AUTO_CONTINUE: 20 → 100 in the installed pi-til-done source.
 * Runs on every pi startup and re-applies the patch if an npm install
 * overwrote it.
 *
 * Install:
 *   1. Add to settings.json `packages`:
 *        "npm:@harms-haus/pi-til-done",
 *        "npm:@steimbyte/pi-til-done-override",
 *      (override MUST load after pi-til-done — order doesn't matter here,
 *       the patch walks node_modules to find the target file)
 *   2. No further config needed.
 *
 * Patch target:
 *   {node_modules}/@harms-haus/pi-til-done/src/types.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";

const PATCH_MARKER = "PATCHED by pi-til-done-override";
const PATCHED_VALUE = 100;

/**
 * Resolve the installed pi-til-done package root via Node's resolution
 * algorithm. This works regardless of where the extension is loaded from
 * (global extensions dir, project node_modules, etc.).
 */
function resolveTilDoneRoot(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const pkgJsonPath = require.resolve("@harms-haus/pi-til-done/package.json");
    return path.dirname(pkgJsonPath);
  } catch {
    return null;
  }
}

function applyPatch(typesPath: string): boolean {
  const content = fs.readFileSync(typesPath, "utf-8");

  if (content.includes(PATCH_MARKER)) return true; // already patched

  // Match the constant line (with or without trailing semicolon, whitespace tolerant)
  const re = /export\s+const\s+MAX_AUTO_CONTINUE\s*=\s*\d+\s*;?/;
  if (!re.test(content)) {
    console.warn(
      "[pi-til-done-override] WARNING: MAX_AUTO_CONTINUE constant not found — " +
      "pi-til-done may have been updated. Patch not applied."
    );
    return false;
  }

  const patched = content.replace(
    re,
    `// ${PATCH_MARKER} → set to ${PATCHED_VALUE}\nexport const MAX_AUTO_CONTINUE = ${PATCHED_VALUE};`
  );

  fs.writeFileSync(typesPath, patched, "utf-8");
  console.log(
    `[pi-til-done-override] MAX_AUTO_CONTINUE patched to ${PATCHED_VALUE}`
  );
  return true;
}

// Run on import
function init() {
  const root = resolveTilDoneRoot();
  if (!root) {
    console.warn(
      "[pi-til-done-override] @harms-haus/pi-til-done not found — patch skipped"
    );
    return;
  }
  const typesPath = path.join(root, "src", "types.ts");
  if (!fs.existsSync(typesPath)) {
    console.warn(
      `[pi-til-done-override] types.ts not found at ${typesPath} — patch skipped`
    );
    return;
  }
  try {
    applyPatch(typesPath);
  } catch (err) {
    console.error("[pi-til-done-override] Patch failed:", err);
  }
}

init();

export default function register() {
  // No additional pi registration needed — patching happens at import time.
  // This default export makes the file a valid pi extension entry point.
}
