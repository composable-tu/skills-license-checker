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

  it("does not invent a name or text for an unknown exception id", () => {
    const result = resolveLicense("GPL-2.0-only WITH Classpath-exception-2.0");
    const exception = result.find((e) => e.spdxId === "Classpath-exception-2.0");
    expect(exception?.name).toBe("Classpath-exception-2.0");
    expect(exception?.text).toBe("");
  });

  it("corrects common misspellings via spdx-correct", () => {
    expect(ids(resolveLicense("apache2"))).toEqual(["Apache-2.0"]);
  });

  it("normalizes lowercase input through the spdx-correct fallback", () => {
    expect(ids(resolveLicense("mit"))).toEqual(["MIT"]);
  });

  it("recovers a single id from a malformed expression", () => {
    expect(ids(resolveLicense("MIT OR"))).toEqual(["MIT"]);
  });

  it("deduplicates repeated licenses within one expression", () => {
    expect(ids(resolveLicense("MIT OR MIT"))).toEqual(["MIT"]);
  });

  it("returns an empty list for unknown declarations", () => {
    expect(resolveLicense("Custom Proprietary License")).toEqual([]);
  });

  it("returns an empty list for empty or non-string input", () => {
    expect(resolveLicense(undefined as unknown as string)).toEqual([]);
    expect(resolveLicense(null as unknown as string)).toEqual([]);
    expect(resolveLicense("")).toEqual([]);
    expect(resolveLicense("   ")).toEqual([]);
  });
});
