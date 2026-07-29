/**
 * Copyright (c) 2026 Skills License Checker
 * SM2 Key Generator is licensed under Mulan PSL v2.
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

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
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

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "minimal-skill",
      description: "Minimal skill",
    });
    expect(result[0].license).toBeUndefined();
    expect(result[0].author).toBeUndefined();
    expect(result[0].version).toBeUndefined();
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

    expect(result[0].sourceUrl).toBe("https://github.com/user/repo");
  });

  // An empty directory with no agent skill folders should yield an empty result.
  it("returns empty array when no skills directory exists", () => {
    const root = mkdtempSync(join(tmpdir(), "skills-test-empty-"));
    dirs.push(root);
    const result = entry(root);

    expect(result).toHaveLength(0);
  });

  // licenseContent is omitted from output by default.
  it("does not include licenseContent by default", () => {
    const root = fixture({
      licenseFile: { name: "LICENSE", content: "MIT License\n\n..." },
    });
    const result = entry(root);

    expect(result[0]).not.toHaveProperty("licenseContent");
  });
});

const MIT_LICENSE_TEXT = "MIT License\n\nCopyright (c) test";

describe("license content", () => {
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

    expect(result[0].licenseContent).toBe(MIT_LICENSE_TEXT);
  });

  it("falls back to LICENSE.md when LICENSE is absent", () => {
    const root = fixture({
      licenseFile: { name: "LICENSE.md", content: "# MIT" },
    });
    const result = entry(root, true);

    expect(result[0].licenseContent).toBe("# MIT");
  });

  it("uses SPDX text when no license file on disk", () => {
    const root = fixture();
    const result = entry(root, true);

    expect(result[0].licenseContent).toContain("Permission is hereby granted");
  });

  it("returns undefined when no license file and no frontmatter license", () => {
    const root = fixture({
      meta: { name: "no-license", description: "No license" },
    });
    const result = entry(root, true);

    expect(result[0].licenseContent).toBeUndefined();
  });
});
