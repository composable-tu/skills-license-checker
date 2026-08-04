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

const frontMatter = require("front-matter");
import type { SkillFind } from "./find-skill.ts";

// https://agentskills.io/specification

/** Exported types */
export interface ParseSkillMeta {
  name: string;
  description: string;
  license?: string;
  author?: string;
  version?: string;
}

/**
 * Per the AgentSkills.io spec, additional metadata lives in a `metadata` object
 * field. Some implementations use `meta` or inline the fields into the root;
 * this handles all three cases.
 */
interface SkillFront {
  name: string;
  description: string;
  license?: string;
  metadata?: SkillMeta;
  meta?: SkillMeta;
  author?: string;
  version?: string;
}

/** Separate `metadata` (or `meta`) object field */
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
      license: attrs.license != null ? String(attrs.license).trim() || undefined : undefined,
      author: attrs.metadata?.author ?? attrs.meta?.author ?? attrs.author,
      version: attrs.metadata?.version ?? attrs.meta?.version ?? attrs.version,
    };
  });
}
