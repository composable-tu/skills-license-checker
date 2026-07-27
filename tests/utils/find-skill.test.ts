import { describe, test, expect, vi, beforeEach } from "vite-plus/test";
import { join } from "node:path";

vi.mock("node:fs", () => ({
  statSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("../../src/utils/parse-vercel-skills-lock.ts", () => ({
  readSkillsLock: vi.fn().mockReturnValue([]),
}));

import { statSync, readdirSync, readFileSync } from "node:fs";
import { readSkillsLock } from "../../src/utils/parse-vercel-skills-lock.ts";
import { findSkills, mergeSkillInfo } from "../../src/utils/find-skill.ts";

const mockStatSync = vi.mocked(statSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReadSkillsLock = vi.mocked(readSkillsLock);

const PROJECT = "/project";

type FsNode = { type: "dir"; children?: string[] } | { type: "file"; content: string };

function mockFs(tree: Record<string, FsNode>) {
  const resolve = (p: unknown): string => {
    const path = String(p);
    const entry = tree[path];
    if (!entry) throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
    return path;
  };

  mockStatSync.mockImplementation((p) => {
    const path = resolve(p);
    return { isDirectory: () => tree[path]!.type === "dir" } as never;
  });

  mockReaddirSync.mockImplementation((p) => {
    const path = resolve(p);
    const entry = tree[path];
    if (entry.type !== "dir")
      throw Object.assign(new Error(`ENOTDIR: ${path}`), { code: "ENOTDIR" });
    return (entry.children ?? []) as never;
  });

  mockReadFileSync.mockImplementation((p) => {
    const path = resolve(p);
    const entry = tree[path];
    if (entry.type !== "file")
      throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
    return entry.content;
  });
}

function skillTree(
  agentDir: string,
  skillName: string,
  content = "skill content",
): Record<string, FsNode> {
  return {
    [join(PROJECT, agentDir)]: { type: "dir" },
    [join(PROJECT, agentDir, "skills")]: {
      type: "dir",
      children: [skillName],
    },
    [join(PROJECT, agentDir, "skills", skillName)]: { type: "dir" },
    [join(PROJECT, agentDir, "skills", skillName, "SKILL.md")]: {
      type: "file",
      content,
    },
  };
}

describe("findSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSkillsLock.mockReturnValue([]);
  });

  test("returns empty array for empty project", () => {
    mockFs({});
    expect(findSkills(PROJECT)).toEqual([]);
  });

  test("finds skill in .agents directory", () => {
    mockFs(skillTree(".agents", "my-skill", "---\n---\nBody"));
    const result = findSkills(PROJECT);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("my-skill");
    expect(result[0].content).toContain("Body");
  });

  test("finds skill in .claude directory", () => {
    mockFs(skillTree(".claude", "claude-skill"));
    expect(findSkills(PROJECT)).toHaveLength(1);
  });

  test("finds skills across multiple agent directories", () => {
    mockFs({
      ...skillTree(".agents", "skill-a"),
      ...skillTree(".claude", "skill-b"),
    });
    const result = findSkills(PROJECT);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name)).toEqual(["skill-a", "skill-b"]);
  });

  test("skips non-agent directories", () => {
    mockFs({
      [join(PROJECT, ".random-dir")]: { type: "dir" },
    });
    expect(findSkills(PROJECT)).toEqual([]);
  });

  test("skips skill directories without SKILL.md", () => {
    mockFs({
      [join(PROJECT, ".agents")]: { type: "dir" },
      [join(PROJECT, ".agents", "skills")]: {
        type: "dir",
        children: ["orphan"],
      },
      [join(PROJECT, ".agents", "skills", "orphan")]: { type: "dir" },
    });
    expect(findSkills(PROJECT)).toEqual([]);
  });

  test("skips non-directory entries in skills folder", () => {
    mockFs({
      [join(PROJECT, ".agents")]: { type: "dir" },
      [join(PROJECT, ".agents", "skills")]: {
        type: "dir",
        children: ["readme.txt"],
      },
    });
    expect(findSkills(PROJECT)).toEqual([]);
  });

  test("handles missing skills subdirectory gracefully", () => {
    mockFs({
      [join(PROJECT, ".agents")]: { type: "dir" },
    });
    expect(findSkills(PROJECT)).toEqual([]);
  });

  test("attaches sourceUrl from lock file", () => {
    mockFs(skillTree(".agents", "locked-skill"));
    mockReadSkillsLock.mockReturnValue([
      { name: "locked-skill", sourceUrl: "https://github.com/user/repo" },
    ]);
    const result = findSkills(PROJECT);
    expect(result[0].sourceUrl).toBe("https://github.com/user/repo");
  });

  test("leaves sourceUrl undefined when not in lock file", () => {
    mockFs(skillTree(".agents", "unlocked"));
    expect(findSkills(PROJECT)[0].sourceUrl).toBeUndefined();
  });

  test("only matches skills present in the lock file", () => {
    mockFs({
      [join(PROJECT, ".agents")]: { type: "dir" },
      [join(PROJECT, ".agents", "skills")]: {
        type: "dir",
        children: ["a", "b"],
      },
      [join(PROJECT, ".agents", "skills", "a")]: { type: "dir" },
      [join(PROJECT, ".agents", "skills", "a", "SKILL.md")]: {
        type: "file",
        content: "a",
      },
      [join(PROJECT, ".agents", "skills", "b")]: { type: "dir" },
      [join(PROJECT, ".agents", "skills", "b", "SKILL.md")]: {
        type: "file",
        content: "b",
      },
    });
    mockReadSkillsLock.mockReturnValue([{ name: "a", sourceUrl: "https://example.com/a" }]);
    const result = findSkills(PROJECT);
    expect(result.find((s) => s.name === "a")?.sourceUrl).toBe("https://example.com/a");
    expect(result.find((s) => s.name === "b")?.sourceUrl).toBeUndefined();
  });
});

describe("mergeSkillInfo", () => {
  test("combines metadata with source URLs", () => {
    const result = mergeSkillInfo(
      [
        {
          name: "alpha",
          description: "A",
          license: "MIT",
          author: "Alice",
          version: "1.0",
        },
      ],
      [{ name: "alpha", content: "", sourceUrl: "https://github.com/a/b" }],
    );
    expect(result).toEqual([
      {
        name: "alpha",
        description: "A",
        license: "MIT",
        author: "Alice",
        version: "1.0",
        sourceUrl: "https://github.com/a/b",
      },
    ]);
  });

  test("sets sourceUrl to undefined when skill not found", () => {
    const result = mergeSkillInfo(
      [
        {
          name: "solo",
          description: "",
          license: undefined,
          author: undefined,
          version: undefined,
        },
      ],
      [],
    );
    expect(result[0].sourceUrl).toBeUndefined();
  });

  test("handles empty inputs", () => {
    expect(mergeSkillInfo([], [])).toEqual([]);
  });

  test("preserves all metadata fields", () => {
    const result = mergeSkillInfo(
      [
        {
          name: "x",
          description: "desc",
          license: "GPL",
          author: "Bob",
          version: "3.0",
        },
      ],
      [{ name: "x", content: "", sourceUrl: "url" }],
    );
    expect(result[0].license).toBe("GPL");
    expect(result[0].author).toBe("Bob");
    expect(result[0].version).toBe("3.0");
  });

  test("matches by skill name", () => {
    const result = mergeSkillInfo(
      [
        {
          name: "a",
          description: "",
          license: undefined,
          author: undefined,
          version: undefined,
        },
        {
          name: "b",
          description: "",
          license: undefined,
          author: undefined,
          version: undefined,
        },
      ],
      [{ name: "b", content: "", sourceUrl: "https://b.dev" }],
    );
    expect(result[0].sourceUrl).toBeUndefined();
    expect(result[1].sourceUrl).toBe("https://b.dev");
  });
});
