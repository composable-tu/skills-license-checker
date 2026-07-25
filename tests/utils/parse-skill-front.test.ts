import { describe, test, expect } from "vite-plus/test";
import { getSkillMeta } from "../../src/utils/parse-skill-front.ts";
import type { SkillFind } from "../../src/utils/find-skill.ts";

function skill(overrides: Partial<SkillFind>): SkillFind {
  return { name: "test", content: "", ...overrides };
}

describe("getSkillMeta", () => {
  test("returns empty array for empty input", () => {
    expect(getSkillMeta([])).toEqual([]);
  });

  test("parses license from front matter", () => {
    const result = getSkillMeta([skill({ content: "---\nlicense: MIT\n---\n" })]);
    expect(result[0].license).toBe("MIT");
  });

  test("parses description from front matter", () => {
    const result = getSkillMeta([skill({ content: "---\ndescription: A useful skill\n---\n" })]);
    expect(result[0].description).toBe("A useful skill");
  });

  test("defaults description to empty string when missing", () => {
    const result = getSkillMeta([skill({ content: "---\n---\n" })]);
    expect(result[0].description).toBe("");
  });

  test("uses skill name as identifier", () => {
    const result = getSkillMeta([skill({ name: "my-skill", content: "---\n---\n" })]);
    expect(result[0].name).toBe("my-skill");
  });

  test("falls back to inline author/version when meta is absent", () => {
    const result = getSkillMeta([
      skill({
        content: "---\nauthor: Bob\nversion: 1.0.0\n---\n",
      }),
    ]);
    expect(result[0].author).toBe("Bob");
    expect(result[0].version).toBe("1.0.0");
  });

  test("parses author and version from meta object", () => {
    const result = getSkillMeta([
      skill({
        content: "---\nmeta:\n  author: Alice\n  version: 2.0.0\n---\n",
      }),
    ]);
    expect(result[0].author).toBe("Alice");
    expect(result[0].version).toBe("2.0.0");
  });

  test("meta fields take precedence over inline fields", () => {
    const result = getSkillMeta([
      skill({
        content:
          "---\nauthor: Bob\nversion: 1.0.0\nmeta:\n  author: Alice\n  version: 2.0.0\n---\n",
      }),
    ]);
    expect(result[0].author).toBe("Alice");
    expect(result[0].version).toBe("2.0.0");
  });

  test("leaves optional fields undefined when absent", () => {
    const result = getSkillMeta([skill({ content: "---\n---\n" })]);
    expect(result[0].license).toBeUndefined();
    expect(result[0].author).toBeUndefined();
    expect(result[0].version).toBeUndefined();
  });

  test("processes multiple skills", () => {
    const result = getSkillMeta([
      skill({ name: "alpha", content: "---\nlicense: MIT\n---\n" }),
      skill({ name: "beta", content: "---\nlicense: Apache-2.0\n---\n" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].license).toBe("MIT");
    expect(result[1].license).toBe("Apache-2.0");
  });
});
