import { defineCommand, runMain } from "citty";
import { findSkills, mergeSkillInfo } from "./utils/find-skill.ts";
import { getSkillMeta } from "./utils/parse-skill-front.ts";

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
  },
  async run({ args }) {
    const skills = findSkills(args.path);
    const skillMeta = getSkillMeta(skills);
    const skillInfo = mergeSkillInfo(skillMeta, skills);

    console.log(`Found ${skillInfo.length} skill(s) in ${args.path}`);
    console.log("---");

    for (const skill of skillInfo) {
      console.log(`Name: ${skill.name}`);
      console.log(`Description: ${skill.description}`);
      console.log(`License: ${skill.license || "Unknown"}`);
      if (skill.author) console.log(`Author: ${skill.author}`);
      if (skill.version) console.log(`Version: ${skill.version}`);
      if (skill.sourceUrl) console.log(`Source: ${skill.sourceUrl}`);
      console.log("---");
    }
  },
});

void runMain(main);
