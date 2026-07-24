import { describe, test, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findSkills } from "../../src/utils/find-skill.ts";

describe("findSkills", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "skills-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns empty array for empty project", () => {
    expect(findSkills(tempDir)).toEqual([]);
  });

  test("returns empty array when .agent/skills missing", () => {
    mkdirSync(join(tempDir, ".agent"), { recursive: true });
    expect(findSkills(tempDir)).toEqual([]);
  });

  test("finds skill in .agent/skills", () => {
    const skillDir = join(tempDir, ".agent", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# My Skill\n\nTest content");

    const result = findSkills(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("my-skill");
    expect(result[0].content).toContain("# My Skill");
  });

  test("finds skills in .agents/skills", () => {
    const skillDir = join(tempDir, ".agents", "skills", "another-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# Another Skill");

    const result = findSkills(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("another-skill");
  });

  test("finds multiple skills", () => {
    const base = join(tempDir, ".agent", "skills");
    mkdirSync(join(base, "skill-a"), { recursive: true });
    writeFileSync(join(base, "skill-a", "SKILL.md"), "A");
    mkdirSync(join(base, "skill-b"), { recursive: true });
    writeFileSync(join(base, "skill-b", "SKILL.md"), "B");

    expect(findSkills(tempDir)).toHaveLength(2);
  });

  test("ignores directories without SKILL.md", () => {
    const skillDir = join(tempDir, ".agent", "skills", "no-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "README.md"), "Not a skill");

    expect(findSkills(tempDir)).toEqual([]);
  });

  test("ignores files in skills directory", () => {
    const skillsDir = join(tempDir, ".agent", "skills");
    mkdirSync(skillsDir, { recursive: true });
    writeFileSync(join(skillsDir, "SKILL.md"), "Orphaned file");

    expect(findSkills(tempDir)).toEqual([]);
  });
});
