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

import licenseList from "spdx-license-list/full.js";
import correct from "spdx-correct";

const OPERATOR_TOKENS = /^(OR|AND|WITH)$/i;
const trimPunctuation = (token: string): string => token.replace(/^[()[\],;]+|[()[\],;]+$/g, "");

/**
 * Resolve every known SPDX id referenced by a license declaration.
 *
 * Accepts a single id ("Apache-2.0") or an SPDX expression ("Apache-2.0 OR
 * MIT"): operators and surrounding punctuation are skipped, each token is
 * spell-corrected via `spdx-correct`, and every recognized id is returned in
 * declaration order. Unknown tokens are ignored, so a free-form name yields an
 * empty array.
 */
export function resolveSpdxIds(declaration: string): string[] {
  if (!declaration || typeof declaration !== "string") return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const token of declaration.trim().split(/\s+/)) {
    const candidate = trimPunctuation(token);
    if (!candidate || OPERATOR_TOKENS.test(candidate)) continue;

    const id = correct(candidate) ?? candidate;
    if (licenseList[id] && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** The first known SPDX id referenced by a declaration, if any. */
export function resolveSpdxId(declaration: string): string | undefined {
  return resolveSpdxIds(declaration)[0];
}

/** The canonical name of a known SPDX id. */
export function getSpdxLicenseName(spdxId: string): string | undefined {
  return licenseList[spdxId]?.name;
}

/** The full license text of a known SPDX id. */
export function getSpdxLicenseText(spdxId: string): string | undefined {
  return licenseList[spdxId]?.licenseText;
}
