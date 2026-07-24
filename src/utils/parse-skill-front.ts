const frontMatter = require("front-matter");
import type { SkillFind } from "./find-skill.ts";

// https://agentskills.io/specification

export interface ParseSkillMeta {
  name: string;
  description: string;
  license?: string;
  author?: string;
  version?: string;
}

interface SkillFront {
  name: string;
  description: string;
  license?: string;
  meta?: SkillMeta;
  author?: string;
  version?: string;
}

interface SkillMeta {
  author?: string;
  version?: string;
}

export function getSkillMeta(skills: SkillFind[]): SkillFront[] {
  return skills.map((skill) => {
    const attrs = frontMatter(skill.content);
    const meta: ParseSkillMeta = {
      name: skill.name,
      description: attrs.description ?? "",
      license: attrs.license,
      author: attrs.meta?.author ?? attrs.author,
      version: attrs.meta?.version ?? attrs.version,
    };
    return meta
  });
}
