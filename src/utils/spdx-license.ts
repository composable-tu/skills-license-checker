/**
 * Copyright (c) 2026 Skills License Checker
 * Skills License Checker is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2.
 * You may obtain a copy of Mulan PSL v2 at:
 *          http://license.coscl.org.cn/MulanPSL2
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT,
 * MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
 * See the Mulan PSL v2 for more details.
 */

import correct from "spdx-correct";
import licenseList from "spdx-license-list/full.js";
import parseExpression from "spdx-expression-parse";

/** A single license (or exception) resolved from a declaration, before hashing. */
export interface ResolvedLicense {
  /** The recognized SPDX id, or `undefined` when the token is unknown. */
  spdxId?: string;
  /** Canonical display name; falls back to the id itself when unknown. */
  name: string;
  /** Full license text when the id is known; empty otherwise. */
  text: string;
}

/**
 * Walk a parsed SPDX expression and collect every license and exception id,
 * in declaration order:
 *
 *   { license: "MIT" }
 *     → ["MIT"]
 *   { license: "GPL-2.0-only", exception: "Classpath-exception-2.0" }
 *     → ["GPL-2.0-only", "Classpath-exception-2.0"]
 *   { conjunction: "or", left, right }
 *     → left ids ++ right ids
 */
function collectIds(node: ReturnType<typeof parseExpression>): string[] {
  if ("license" in node) {
    return node.exception ? [node.license, node.exception] : [node.license];
  }
  return [...collectIds(node.left), ...collectIds(node.right)];
}

/** Look up the canonical name and full text for a (possibly corrected) SPDX id. */
function describe(id: string): { name: string; text: string } {
  const meta = licenseList[id];
  return { name: meta?.name ?? id, text: meta?.licenseText ?? "" };
}

/**
 * Resolve a license declaration into structured license entries.
 *
 * The declaration is parsed as an SPDX expression, so OR / AND / WITH operators
 * and parentheses are handled correctly — e.g. `"(MIT AND Apache-2.0) OR ISC"`
 * or `"GPL-2.0-only WITH Classpath-exception-2.0"`. Every id is spell-corrected
 * via `spdx-correct`, and invalid expressions fall back to correcting the whole
 * string as a single name. Unknown declarations yield an empty list, so callers
 * always have a clear "nothing resolved" signal to fall back on.
 *
 * This is the single source of truth for turning a raw declaration into license
 * data; downstream code hashes the `text` and attaches the `spdxId`/`name`.
 */
export function resolveLicense(declaration: string): ResolvedLicense[] {
  if (typeof declaration !== "string") return [];
  const trimmed = declaration.trim();
  if (!trimmed) return [];

  // Valid SPDX expression first — keeps the OR/AND/WITH structure intact.
  const rawIds: string[] = [];
  try {
    rawIds.push(...collectIds(parseExpression(trimmed)));
  } catch {
    // Not a valid expression — treat the whole string as one name instead.
    const single = correct(trimmed);
    if (single) rawIds.push(single);
  }

  const seen = new Set<string>();
  const entries: ResolvedLicense[] = [];
  for (const raw of rawIds) {
    const spdxId = correct(raw) ?? raw;
    if (seen.has(spdxId)) continue;
    seen.add(spdxId);
    const { name, text } = describe(spdxId);
    entries.push({ spdxId, name, text });
  }
  return entries;
}
