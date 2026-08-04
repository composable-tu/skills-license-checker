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

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { describe, it, expect, afterEach } from "vite-plus/test";
import { entry } from "../src/index.ts";

/** Converts a key-value map into a YAML frontmatter block. */
function buildFrontmatter(meta: Record<string, string | undefined>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (value) lines.push(`${key}: ${value}`);
  }
  lines.push("---");
  return lines.join("\n");
}

/**
 * Creates a temporary directory that mimics the on-disk skill layout:
 *
 *   <tmp>/
 *     .claude/skills/<name>/SKILL.md   ← skill with YAML frontmatter
 *     skills-lock.json                 ← optional lock file
 *
 * Returns the root path to pass into `entry()`.
 */
function createSkillFixture(opts?: {
  name?: string;
  meta?: Record<string, string | undefined>;
  lockFile?: Record<string, unknown>;
  licenseFile?: { name: string; content: string };
}) {
  const name = opts?.name ?? "test-skill";
  const meta = opts?.meta ?? {
    name,
    description: "A test skill",
    license: "MIT",
    author: "Test Author",
    version: "1.0.0",
  };

  const root = mkdtempSync(join(tmpdir(), "skills-test-"));
  const skillDir = join(root, ".claude", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), buildFrontmatter(meta));

  if (opts?.licenseFile) {
    writeFileSync(join(skillDir, opts.licenseFile.name), opts.licenseFile.content);
  }

  if (opts?.lockFile) {
    writeFileSync(join(root, "skills-lock.json"), JSON.stringify(opts.lockFile));
  }

  return root;
}

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("entry", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  function fixture(opts?: Parameters<typeof createSkillFixture>[0]) {
    const root = createSkillFixture(opts);
    dirs.push(root);
    return root;
  }

  // Default fixture: full frontmatter (name, description, license, author, version).
  it("finds a skill with full metadata", () => {
    const root = fixture();
    const result = entry(root);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toMatchObject({
      name: "test-skill",
      description: "A test skill",
      license: "MIT",
      author: "Test Author",
      version: "1.0.0",
    });
  });

  // Only `name` and `description` are present; all optional fields should be absent.
  it("handles skills with only required fields", () => {
    const root = fixture({
      name: "minimal-skill",
      meta: { name: "minimal-skill", description: "Minimal skill" },
    });
    const result = entry(root);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toMatchObject({
      name: "minimal-skill",
      description: "Minimal skill",
    });
    expect(result.skills[0].license).toBeUndefined();
    expect(result.skills[0].author).toBeUndefined();
    expect(result.skills[0].version).toBeUndefined();
    expect(result.skills[0].licenses).toEqual([]);
  });

  // When a skills-lock.json maps a skill to a GitHub source, sourceUrl should be resolved.
  it("resolves sourceUrl from skills-lock.json", () => {
    const root = fixture({
      lockFile: {
        skills: {
          "test-skill": { source: "user/repo", sourceType: "github" },
        },
      },
    });
    const result = entry(root);

    expect(result.skills[0].sourceUrl).toBe("https://github.com/user/repo");
  });

  // An empty directory with no agent skill folders should yield an empty result.
  it("returns empty array when no skills directory exists", () => {
    const root = mkdtempSync(join(tmpdir(), "skills-test-empty-"));
    dirs.push(root);
    const result = entry(root);

    expect(result.skills).toHaveLength(0);
  });

  // License full text is not included in the report by default.
  it("does not include license content by default", () => {
    const root = fixture({
      licenseFile: { name: "LICENSE", content: "MIT License\n\n..." },
    });
    const result = entry(root);

    expect(result.licenses[result.skills[0].licenses[0]].content).toBe("");
  });
});

const MIT_LICENSE_TEXT = "MIT License\n\nCopyright (c) test";

describe("license report", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  function fixture(opts?: Parameters<typeof createSkillFixture>[0]) {
    const root = createSkillFixture(opts);
    dirs.push(root);
    return root;
  }

  it("reads LICENSE file from skill directory", () => {
    const root = fixture({
      licenseFile: { name: "LICENSE", content: MIT_LICENSE_TEXT },
    });
    const result = entry(root, true);
    const hash = result.skills[0].licenses[0];

    expect(hash).toBe(contentHash(MIT_LICENSE_TEXT));
    expect(result.licenses[hash].content).toBe(MIT_LICENSE_TEXT);
  });

  it("falls back to LICENSE.md when LICENSE is absent", () => {
    const root = fixture({
      licenseFile: { name: "LICENSE.md", content: "# MIT" },
    });
    const result = entry(root, true);

    expect(result.licenses[result.skills[0].licenses[0]].content).toBe("# MIT");
  });

  it("omits spdxId when only a LICENSE file exists and no declaration resolves", () => {
    const root = fixture({
      meta: { name: "file-only", description: "No declared license" },
      licenseFile: { name: "LICENSE", content: "Custom proprietary terms" },
    });
    const result = entry(root, true);
    const entry_ = result.licenses[result.skills[0].licenses[0]];

    expect(entry_.spdxId).toBeUndefined();
    expect(entry_.content).toBe("Custom proprietary terms");
  });

  it("uses SPDX text when no license file on disk", () => {
    const root = fixture();
    const result = entry(root, true);
    const [hash] = result.skills[0].licenses;

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.licenses[hash]).toMatchObject({
      name: "MIT License",
      spdxId: "MIT",
    });
    expect(result.licenses[hash].content).toContain("Permission is hereby granted");
  });

  it("hashes license text, not the SPDX id", () => {
    const root = fixture();
    const result = entry(root, true);

    expect(result.skills[0].licenses[0]).not.toBe("MIT");
  });

  it("returns no licenses when no license file and no frontmatter license", () => {
    const root = fixture({
      meta: { name: "no-license", description: "No license" },
    });
    const result = entry(root, true);

    expect(result.skills[0].licenses).toEqual([]);
    expect(Object.keys(result.licenses)).toHaveLength(0);
  });

  it("expands an OR expression to every involved license with full text", () => {
    const root = fixture({
      meta: {
        name: "expr-skill",
        description: "Expr skill",
        license: "Apache-2.0 OR MIT",
      },
    });
    const result = entry(root, true);

    expect(result.skills[0].license).toBe("Apache-2.0");
    const entries = result.skills[0].licenses.map((hash) => result.licenses[hash]);
    const ids = entries.map((e) => e.spdxId).filter((id): id is string => id !== undefined);
    expect(ids.sort((a, b) => a.localeCompare(b))).toEqual(["Apache-2.0", "MIT"]);

    const apache = entries.find((e) => e.spdxId === "Apache-2.0");
    const mit = entries.find((e) => e.spdxId === "MIT");
    expect(apache!.content).toContain("Apache License");
    expect(mit!.content).toContain("Permission is hereby granted");
  });

  it("expands a parenthesized AND expression to every involved license", () => {
    const root = fixture({
      meta: {
        name: "and-skill",
        description: "And skill",
        license: "(MIT AND Apache-2.0)",
      },
    });
    const result = entry(root, true);

    expect(result.skills[0].license).toBe("MIT");
    const entries = result.skills[0].licenses.map((hash) => result.licenses[hash]);
    expect(entries.map((e) => e.spdxId)).toEqual(["MIT", "Apache-2.0"]);
  });

  it("keeps the raw value when no token resolves to a known SPDX id", () => {
    const root = fixture({
      meta: {
        name: "unknown-skill",
        description: "Unknown skill",
        license: "Custom License OR Something",
      },
    });
    const result = entry(root, true);

    expect(result.skills[0].license).toBe("Custom License OR Something");
    expect(result.skills[0].licenses).toEqual([]);
  });

  it("collapses skills shipping identical license text into one shared entry", () => {
    const root = createSkillFixture({
      name: "alpha",
      meta: { name: "alpha", description: "Alpha", license: "MIT" },
      licenseFile: { name: "LICENSE", content: MIT_LICENSE_TEXT },
    });
    const betaRoot = createSkillFixture({
      name: "beta",
      meta: { name: "beta", description: "Beta", license: "MIT" },
      licenseFile: { name: "LICENSE", content: MIT_LICENSE_TEXT },
    });
    dirs.push(root, betaRoot);

    const result = entry(root, true);
    const beta = entry(betaRoot, true);

    expect(result.skills[0].licenses).toEqual(beta.skills[0].licenses);
    expect(Object.keys(result.licenses)).toHaveLength(1);
  });

  it("keeps distinct text under the same SPDX id as separate entries", () => {
    const root = createSkillFixture({
      name: "alpha",
      meta: { name: "alpha", description: "Alpha", license: "MIT" },
      licenseFile: { name: "LICENSE", content: "Custom MIT variant A" },
    });
    const betaRoot = createSkillFixture({
      name: "beta",
      meta: { name: "beta", description: "Beta", license: "MIT" },
      licenseFile: { name: "LICENSE", content: "Custom MIT variant B" },
    });
    dirs.push(root, betaRoot);

    const alpha = entry(root, true);
    const beta = entry(betaRoot, true);
    const hashA = alpha.skills[0].licenses[0];
    const hashB = beta.skills[0].licenses[0];

    expect(hashA).not.toBe(hashB);
    expect(alpha.licenses[hashA].content).toBe("Custom MIT variant A");
    expect(beta.licenses[hashB].content).toBe("Custom MIT variant B");
  });

  it("merges skills sharing the same SPDX text into one shared entry", () => {
    const root = createSkillFixture({
      name: "alpha",
      meta: { name: "alpha", description: "Alpha", license: "MIT" },
    });
    const betaRoot = createSkillFixture({
      name: "beta",
      meta: { name: "beta", description: "Beta", license: "MIT" },
    });
    dirs.push(root, betaRoot);

    const alpha = entry(root, true);
    const beta = entry(betaRoot, true);

    expect(alpha.skills[0].licenses[0]).toBe(beta.skills[0].licenses[0]);
    expect(Object.keys(alpha.licenses)).toHaveLength(1);
  });
});
