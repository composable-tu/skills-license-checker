import { defineCommand, runMain } from "citty";
import { findSkills } from "./utils/find-skill.ts";
import { getSkillMeta } from "./utils/parse-skill-front.ts";

const main = defineCommand({
  meta: {
    name: "skills-license-checker",
    description: "Scan skills in project directory and check licenses",
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

    console.log(`Found ${skillMeta.length} skill(s) in ${args.path}`);
    console.log("---");

    for (const skill of skillMeta) {
      console.log(`Name: ${skill.name}`);
      console.log(`Description: ${skill.description}`);
      console.log(`License: ${skill.license || "Unknown"}`);
      if (skill.author) console.log(`Author: ${skill.author}`);
      if (skill.version) console.log(`Version: ${skill.version}`);
      console.log("---");
    }
  },
});

void runMain(main);
