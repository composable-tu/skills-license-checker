const frontMatter = require("front-matter");
import type { SkillFind } from "./find-skill.ts";

// https://agentskills.io/specification

// Exported types
export interface ParseSkillMeta {
  name: string;
  description: string;
  license?: string;
  author?: string;
  version?: string;
}

/**
 * Per the AgentSkills.io spec, `meta` is a separate object field, not a root field.
 * Some implementations inline meta fields into the root; this handles both cases.
 */
interface SkillFront {
  name: string;
  description: string;
  license?: string;
  meta?: SkillMeta;
  author?: string;
  version?: string;
}

// Separate `meta` object field
interface SkillMeta {
  author?: string;
  version?: string;
}

export function getSkillMeta(skills: SkillFind[]): ParseSkillMeta[] {
  return skills.map((skill) => {
    const attrs: SkillFront = frontMatter(skill.content).attributes;
    return {
      name: skill.name,
      description: attrs.description ?? "",
      license: attrs.license,
      author: attrs.meta?.author ?? attrs.author,
      version: attrs.meta?.version ?? attrs.version,
    };
  });
}
