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

import { defineCommand, runMain } from "citty";
import { findSkills, mergeSkillInfo, type SkillLicenseReport } from "./utils/find-skill.ts";
import { getSkillMeta } from "./utils/parse-skill-front.ts";

export function entry(path: string, includeLicenseContent = false): SkillLicenseReport {
  const skills = findSkills(path);
  const skillMeta = getSkillMeta(skills);
  return mergeSkillInfo(skillMeta, skills, includeLicenseContent);
}

const main = defineCommand({
  meta: {
    name: "skills-license-checker",
    description:
      "A JS library to help JS/TS developers quickly generate information regarding Agent Skills for use at the project level.",
  },
  args: {
    path: {
      type: "string",
      description: "Project root path",
      default: process.cwd(),
    },
    format: {
      type: "string",
      description: "Output format",
      default: "text",
    },
    "include-license-content": {
      type: "boolean",
      description: "Include full license file content in output",
      default: false,
    },
  },
  async run({ args }) {
    const format = args.format ?? "text";

    if (format !== "text" && format !== "json")
      throw new Error(
        `Unsupported output format: ${format}. Supported formats are "text" and "json".`,
      );

    const skillInfo = entry(args.path, args["include-license-content"]);

    switch (format) {
      case "json":
        console.log(JSON.stringify(skillInfo, null, 2));
        break;
      default:
        console.log(`Found ${skillInfo.skills.length} skill(s) in ${args.path}`);
        console.log("---");

        for (const skill of skillInfo.skills) {
          console.log(`Name: ${skill.name}`);
          console.log(`Description: ${skill.description}`);
          console.log(`License: ${skill.license || "Unknown"}`);
          if (skill.author) console.log(`Author: ${skill.author}`);
          if (skill.version) console.log(`Version: ${skill.version}`);
          if (skill.sourceUrl) console.log(`Source: ${skill.sourceUrl}`);
          if (args["include-license-content"]) {
            for (const hash of skill.licenses) {
              const license = skillInfo.licenses[hash];
              if (license?.content) console.log(`License Content:\n${license.content}`);
            }
          }
          console.log("---");
        }
        break;
    }
  },
});

void runMain(main);
