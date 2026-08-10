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

import { describe, expect, it } from "vite-plus/test";
import { resolveLicense, type ResolvedLicense } from "../src/utils/spdx-license.ts";
import {
  collectSkillLicenses,
  fileEntry,
  type LicenseInfo,
  type SkillFind,
} from "../src/utils/find-skill.ts";
import type { ParseSkillMeta } from "../src/utils/parse-skill-front.ts";

/** Extract just the SPDX ids from a list of resolved licenses. */
const ids = (entries: ResolvedLicense[]): (string | undefined)[] => entries.map((e) => e.spdxId);

describe("resolveLicense", () => {
  it("resolves a single SPDX id with canonical name and full text", () => {
    const [lic] = resolveLicense("MIT");
    expect(lic.spdxId).toBe("MIT");
    expect(lic.name).toBe("MIT License");
    expect(lic.text).toContain("Permission is hereby granted");
  });

  it("lists every license in an OR expression", () => {
    const result = ids(resolveLicense("Apache-2.0 OR MIT"));
    expect(result).toContain("Apache-2.0");
    expect(result).toContain("MIT");
  });

  it("lists every license in an AND expression", () => {
    const result = ids(resolveLicense("MIT AND ISC"));
    expect(result).toContain("MIT");
    expect(result).toContain("ISC");
  });

  it("respects parenthesized grouping order", () => {
    expect(ids(resolveLicense("(MIT AND Apache-2.0) OR ISC"))).toEqual([
      "MIT",
      "Apache-2.0",
      "ISC",
    ]);
  });

  it("keeps a WITH exception as a separate entry", () => {
    const result = resolveLicense("GPL-2.0-only WITH Classpath-exception-2.0");
    expect(ids(result)).toEqual(["GPL-2.0-only", "Classpath-exception-2.0"]);
  });

  it("carries the exception id as text when its full text is unavailable", () => {
    const result = resolveLicense("GPL-2.0-only WITH Classpath-exception-2.0");
    const exception = result.find((e) => e.spdxId === "Classpath-exception-2.0");
    expect(exception?.name).toBe("Classpath-exception-2.0");
    // No exception text ships in spdx-license-list, so the id itself is carried
    // as text — this keeps distinct exceptions from hashing to the same empty key.
    expect(exception?.text).toBe("Classpath-exception-2.0");
  });

  it("corrects common misspellings via spdx-correct", () => {
    expect(ids(resolveLicense("apache2"))).toEqual(["Apache-2.0"]);
  });

  it("normalizes lowercase input through the spdx-correct fallback", () => {
    expect(ids(resolveLicense("mit"))).toEqual(["MIT"]);
  });

  it("preserves a malformed declaration verbatim rather than dropping part of it", () => {
    // "MIT OR" is not a valid SPDX expression. As a compliance tool we must
    // not silently turn it into "MIT"; the raw declaration is carried through.
    const [lic] = resolveLicense("MIT OR");
    expect(lic.spdxId).toBeUndefined();
    expect(lic.name).toBe("MIT OR");
    expect(lic.text).toBe("MIT OR");
  });

  it("deduplicates repeated licenses within one expression", () => {
    expect(ids(resolveLicense("MIT OR MIT"))).toEqual(["MIT"]);
  });

  it("preserves a mixed known+unknown declaration verbatim rather than dropping the unknown part", () => {
    // Compliance policy: a LicenseChecker must not unilaterally alter anyone's
    // declared license. A declaration that is not a valid SPDX expression — even
    // one mixing a recognized id with a custom name — is carried through as-is.
    const lic = resolveLicense("MIT OR Custom Proprietary License")[0];
    expect(lic.spdxId).toBeUndefined();
    expect(lic.name).toBe("MIT OR Custom Proprietary License");
    expect(lic.text).toBe("MIT OR Custom Proprietary License");

    const lic2 = resolveLicense("Custom Proprietary License OR ISC")[0];
    expect(lic2.spdxId).toBeUndefined();
    expect(lic2.name).toBe("Custom Proprietary License OR ISC");
    expect(lic2.text).toBe("Custom Proprietary License OR ISC");
  });

  it("returns a single entry carrying the raw declaration for unknown (non-SPDX) licenses", () => {
    // Non-SPDX projects must still get a represented license entry rather than
    // being dropped — the raw declaration is carried so it stays identifiable.
    const [lic] = resolveLicense("Custom Proprietary License");
    expect(lic.spdxId).toBeUndefined();
    expect(lic.name).toBe("Custom Proprietary License");
    expect(lic.text).toBe("Custom Proprietary License");
  });

  it("keeps distinct unknown declarations as separate entries", () => {
    const a = resolveLicense("Custom Proprietary License");
    const b = resolveLicense("My Custom Thing");
    expect(a[0].text).not.toBe(b[0].text);
  });

  it("returns an empty list for empty or non-string input", () => {
    expect(resolveLicense(undefined as unknown as string)).toEqual([]);
    expect(resolveLicense(null as unknown as string)).toEqual([]);
    expect(resolveLicense("")).toEqual([]);
    expect(resolveLicense("   ")).toEqual([]);
  });
});

/** Run collectSkillLicenses against an in-memory license map. */
function collect(
  meta: Partial<ParseSkillMeta>,
  found?: Partial<SkillFind>,
): { result: ReturnType<typeof collectSkillLicenses>; licenses: Map<string, LicenseInfo> } {
  const licenses = new Map<string, LicenseInfo>();
  const result = collectSkillLicenses(
    meta as ParseSkillMeta,
    found as unknown as SkillFind | undefined,
    licenses,
  );
  return { result, licenses };
}

describe("fileEntry", () => {
  it("returns a single entry named after a valid SPDX id", () => {
    const text = "Copyright (c) Example\nLicensed under the MIT License.";
    const [lic] = fileEntry("MIT", text);
    expect(lic.spdxId).toBe("MIT");
    expect(lic.name).toBe("MIT License");
    expect(lic.text).toBe(text);
  });

  it("falls back to a generic name for an empty declaration", () => {
    const text = "Custom proprietary terms, no SPDX declared.";
    const [lic] = fileEntry("", text);
    expect(lic.spdxId).toBeUndefined();
    expect(lic.name).toBe("License");
    expect(lic.text).toBe(text);
  });

  it("picks the first resolved id when the declaration has several", () => {
    const text = "Dual licensed under MIT or Apache-2.0.";
    const [lic] = fileEntry("MIT OR Apache-2.0", text);
    expect(lic.spdxId).toBe("MIT");
    expect(lic.name).toBe("MIT License");
    expect(lic.text).toBe(text);
  });
});

describe("collectSkillLicenses", () => {
  it("uses the declaration as primary license with no LICENSE file", () => {
    const { result } = collect({ license: "MIT" });
    expect(result.primaryLicense).toBe("MIT");
    expect(result.hashes).toHaveLength(1);
  });

  it("prefers the LICENSE file text but keeps the SPDX id from the declaration", () => {
    const text = "MIT License\n\nPermission is hereby granted...";
    const { result, licenses } = collect({ license: "MIT" }, { licenseContent: text });
    expect(result.primaryLicense).toBe("MIT");
    expect(result.hashes).toHaveLength(1);
    const info = licenses.get(result.hashes[0])!;
    expect(info.spdxId).toBe("MIT");
    expect(info.content).toBe(text);
  });

  it("handles a LICENSE file with no declaration", () => {
    const text = "Custom proprietary text with no SPDX ID.";
    const { result, licenses } = collect({ license: undefined }, { licenseContent: text });
    expect(result.primaryLicense).toBeUndefined();
    expect(result.hashes).toHaveLength(1);
    expect(licenses.get(result.hashes[0])!.content).toBe(text);
  });

  it("returns no licenses when neither declaration nor file exists", () => {
    const { result } = collect({ license: undefined });
    expect(result.primaryLicense).toBeUndefined();
    expect(result.hashes).toHaveLength(0);
  });

  it("keeps a custom non-SPDX declaration as the primary license", () => {
    // No LICENSE file: a custom/non-SPDX declaration must be preserved verbatim
    // as the primary license, not dropped or rewritten.
    const { result, licenses } = collect({ license: "Custom Proprietary License" });
    expect(result.primaryLicense).toBe("Custom Proprietary License");
    expect(result.hashes).toHaveLength(1);
    const info = licenses.get(result.hashes[0])!;
    expect(info.spdxId).toBeUndefined();
  });
});
