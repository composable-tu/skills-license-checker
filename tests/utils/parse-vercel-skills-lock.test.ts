import { describe, test, expect, vi, beforeEach } from "vite-plus/test";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { readSkillsLock } from "../../src/utils/parse-vercel-skills-lock.ts";

const mockReadFileSync = vi.mocked(readFileSync);
const PROJECT = "/project";

function mockLockJson(data: object) {
  mockReadFileSync.mockReturnValue(JSON.stringify(data));
}

function mockLockMissing() {
  mockReadFileSync.mockImplementation(() => {
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  });
}

describe("readSkillsLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns empty array when file is missing", () => {
    mockLockMissing();
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("returns empty array when JSON is malformed", () => {
    mockReadFileSync.mockReturnValue("not json");
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("returns empty array when skills field is absent", () => {
    mockLockJson({ version: 1 });
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("returns empty array when skills object is empty", () => {
    mockLockJson({ skills: {} });
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("resolves github source type to HTTPS URL", () => {
    mockLockJson({
      skills: {
        "my-skill": { source: "alice/awesome-skills", sourceType: "github" },
      },
    });
    expect(readSkillsLock(PROJECT)).toEqual([
      {
        name: "my-skill",
        sourceUrl: "https://github.com/alice/awesome-skills",
      },
    ]);
  });

  test("resolves git source type via git-url-parse", () => {
    mockLockJson({
      skills: {
        "git-skill": {
          source: "git@github.com:bob/repo.git",
          sourceType: "git",
          sourceUrl: "git@github.com:bob/repo.git",
        },
      },
    });
    const result = readSkillsLock(PROJECT);
    expect(result).toHaveLength(1);
    expect(result[0].sourceUrl).toMatch(/^https:\/\/github\.com\/bob\/repo/);
  });

  test("resolves gitlab source type via git-url-parse", () => {
    mockLockJson({
      skills: {
        "gl-skill": {
          source: "group/project",
          sourceType: "gitlab",
          sourceUrl: "https://gitlab.com/group/project.git",
        },
      },
    });
    const result = readSkillsLock(PROJECT);
    expect(result).toHaveLength(1);
    expect(result[0].sourceUrl).toMatch(/^https:\/\/gitlab\.com\/group\/project/);
  });

  test("skips entries with unknown sourceType", () => {
    mockLockJson({
      skills: { unknown: { source: "something", sourceType: "npm" } },
    });
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("skips git entries without sourceUrl", () => {
    mockLockJson({
      skills: { incomplete: { source: "repo", sourceType: "git" } },
    });
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("skips gitlab entries without sourceUrl", () => {
    mockLockJson({
      skills: { incomplete: { source: "group/proj", sourceType: "gitlab" } },
    });
    expect(readSkillsLock(PROJECT)).toEqual([]);
  });

  test("collects multiple skills", () => {
    mockLockJson({
      skills: {
        alpha: { source: "u/a", sourceType: "github" },
        beta: { source: "u/b", sourceType: "github" },
      },
    });
    const result = readSkillsLock(PROJECT);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name)).toEqual(["alpha", "beta"]);
  });
});
