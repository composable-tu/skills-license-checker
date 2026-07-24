import { describe, test, expect } from "vite-plus/test";
import { getSkillMeta } from "../../src/utils/parse-skill-front.ts";

describe("getSkillMeta", () => {
  test("parses basic front matter", () => {
    const skills = [
      {
        name: "test-skill",
        content: "---\nname: Test Skill\nlicense: MIT\n---\nDescription here",
      },
    ];

    const result = getSkillMeta(skills);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("test-skill");
    expect(result[0].license).toBe("MIT");
  });

  test("handles missing optional fields", () => {
    const skills = [{ name: "bare-skill", content: "---\n---\nNo metadata" }];

    const result = getSkillMeta(skills);
    expect(result[0].license).toBeUndefined();
    expect(result[0].author).toBeUndefined();
    expect(result[0].version).toBeUndefined();
  });

  test("returns empty array for empty input", () => {
    expect(getSkillMeta([])).toEqual([]);
  });

  test("parses meta.author and meta.version", () => {
    const skills = [
      {
        name: "skill",
        content: "---\nmeta:\n  author: Alice\n  version: 1.0.0\n---\n",
      },
    ];

    const result = getSkillMeta(skills);
    expect(result[0].author).toBe("Alice");
    expect(result[0].version).toBe("1.0.0");
  });
});
