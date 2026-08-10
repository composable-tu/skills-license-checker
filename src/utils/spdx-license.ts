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
  /** Canonical display name; for an unrecognized declaration this is the raw string. */
  name: string;
  /**
   * Full license text when the id is known; for an unrecognized declaration the
   * raw string is carried here so the entry stays identifiable and hashes to a
   * distinct key instead of collapsing with other unknown licenses.
   */
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
 * Three cases, all designed so the tool never rewrites someone's compliance
 * declaration:
 *
 * 1. **Valid SPDX expression** — e.g. `"(MIT AND Apache-2.0) OR ISC"` or
 *    `"GPL-2.0-only WITH Classpath-exception-2.0"`. Parsed with
 *    `spdx-expression-parse`, then every recognized id is spell-corrected via
 *    `spdx-correct` and looked up for its canonical name and text. The
 *    OR / AND / WITH structure is preserved exactly as declared — nothing is
 *    dropped or invented.
 *
 * 2. **A single, misspelled SPDX id** — e.g. `"apache2"` or `"mit"`. Normalized
 *    to its canonical id. This branch is intentionally limited to single-token
 *    declarations: a free-form or mixed declaration is never silently rewritten.
 *
 * 3. **Anything else** — a custom/non-SPDX name, a known id mixed with a custom
 *    name (`"MIT OR Custom Proprietary License"`), or malformed syntax. Carried
 *    through **verbatim** as a single entry carrying the raw string, so the
 *    declaration stays represented in the report and (because it is also used
 *    as `text`) hashes to a distinct key instead of collapsing with other
 *    unknown licenses.
 *
 * This is the single source of truth for turning a raw declaration into license
 * data; downstream code hashes the `text` and attaches the `spdxId`/`name`.
 */
export function resolveLicense(declaration: string): ResolvedLicense[] {
  if (typeof declaration !== "string") return [];
  const trimmed = declaration.trim();
  if (!trimmed) return [];

  // 1. Valid SPDX expression → expand every recognized node, preserving the
  //    OR / AND / WITH structure exactly as declared.
  try {
    return expand(collectIds(parseExpression(trimmed)));
  } catch {
    // Not a parseable SPDX expression; fall through.
  }

  // 2. A single token that is merely a misspelling/case-variant of a known
  //    SPDX id — normalize it. Limited to single tokens so a free-form or
  //    mixed declaration is never silently rewritten (spdx-correct would
  //    otherwise fuzzy-match "MIT OR Custom Proprietary License" to "MIT").
  if (!/\s/.test(trimmed)) {
    const corrected = correct(trimmed);
    if (corrected) return expand([corrected]);
  }

  // 3. Anything else — carry the raw declaration through verbatim. As a
  //    compliance tool we must not drop or rewrite anyone's declared license.
  return [{ spdxId: undefined, name: trimmed, text: trimmed }];
}

/** Expand a list of (already recognized) SPDX ids into resolved entries. */
function expand(rawIds: string[]): ResolvedLicense[] {
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
