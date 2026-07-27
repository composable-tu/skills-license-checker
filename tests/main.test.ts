import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, afterEach } from "vite-plus/test";
import { entry } from "../src/index.ts";

// Tracks the temp directory created per test for automatic cleanup.
let tempDir: string;

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

/** Converts a key-value map into a YAML frontmatter block. */
function buildFrontmatter(meta: Record<string, string | undefined>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) lines.push(`${key}: ${value}`);
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

  tempDir = mkdtempSync(join(tmpdir(), "skills-test-"));
  const skillDir = join(tempDir, ".claude", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), buildFrontmatter(meta));

  if (opts?.licenseFile) {
    writeFileSync(join(skillDir, opts.licenseFile.name), opts.licenseFile.content);
  }

  if (opts?.lockFile) {
    writeFileSync(join(tempDir, "skills-lock.json"), JSON.stringify(opts.lockFile));
  }

  return tempDir;
}

describe("entry", () => {
  // Default fixture: full frontmatter (name, description, license, author, version).
  it("finds a skill with full metadata", () => {
    const root = createSkillFixture();
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
    const root = createSkillFixture({
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
    const root = createSkillFixture({
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
    tempDir = mkdtempSync(join(tmpdir(), "skills-test-empty-"));
    const result = entry(tempDir);

    expect(result).toHaveLength(0);
  });

  // licenseContent is omitted from output by default.
  it("does not include licenseContent by default", () => {
    const root = createSkillFixture({
      licenseFile: { name: "LICENSE", content: "MIT License\n\n..." },
    });
    const result = entry(root);

    expect(result[0]).not.toHaveProperty("licenseContent");
  });
});

const MIT_LICENSE_TEXT = "MIT License\n\nCopyright (c) test";

describe("license content", () => {
  it("reads LICENSE file from skill directory", () => {
    const root = createSkillFixture({
      licenseFile: { name: "LICENSE", content: MIT_LICENSE_TEXT },
    });
    const result = entry(root, true);

    expect(result[0].licenseContent).toBe(MIT_LICENSE_TEXT);
  });

  it("falls back to LICENSE.md when LICENSE is absent", () => {
    const root = createSkillFixture({
      licenseFile: { name: "LICENSE.md", content: "# MIT" },
    });
    const result = entry(root, true);

    expect(result[0].licenseContent).toBe("# MIT");
  });

  it("uses SPDX text when no license file on disk", () => {
    const root = createSkillFixture();
    const result = entry(root, true);

    expect(result[0].licenseContent).toContain("Permission is hereby granted");
  });

  it("returns undefined when no license file and no frontmatter license", () => {
    const root = createSkillFixture({
      meta: { name: "no-license", description: "No license" },
    });
    const result = entry(root, true);

    expect(result[0].licenseContent).toBeUndefined();
  });

  it("does not include licenseContent by default", () => {
    const root = createSkillFixture({
      licenseFile: { name: "LICENSE", content: MIT_LICENSE_TEXT },
    });
    const result = entry(root);

    expect(result[0]).not.toHaveProperty("licenseContent");
  });
});
