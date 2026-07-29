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

const frontMatter = require("front-matter");
import type { SkillFind } from "./find-skill.ts";
import spdxCorrect from "spdx-correct";

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

/** Separate `meta` object field */
interface SkillMeta {
  author?: string;
  version?: string;
}

export function getSkillMeta(skills: SkillFind[]): ParseSkillMeta[] {
  return skills.map((skill) => {
    const attrs: SkillFront = frontMatter(skill.content).attributes;
    const result: ParseSkillMeta = {
      name: skill.name,
      description: attrs.description ?? "",
      author: attrs.meta?.author ?? attrs.author,
      version: attrs.meta?.version ?? attrs.version,
    };
    if (attrs.license != null) {
      const license = spdxCorrect(attrs.license) ?? undefined;
      if (license) result.license = license;
    }
    return result;
  });
}
