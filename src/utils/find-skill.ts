import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { agentDirs } from "../config/agent-dirs.ts";
import { readSkillsLock } from "./parse-vercel-skills-lock.ts";
import type { ParseSkillMeta } from "./parse-skill-front.ts";

// Exported types
export interface ReturnSkillInfo {
  name: string;
  description: string;
  license?: string;
  author?: string;
  version?: string;
  sourceUrl?: string;
}

export interface SkillFind {
  name: string;
  content: string;
  sourceUrl?: string;
}

const SKILL_FILE = "SKILL.md";

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readSkillFile(skillDirPath: string): SkillFind | undefined {
  const skillFilePath = join(skillDirPath, SKILL_FILE);
  try {
    const content = readFileSync(skillFilePath, "utf-8");
    return { name: basename(skillDirPath), content };
  } catch {
    return undefined;
  }
}

function scanSkillsDir(skillsDirPath: string): SkillFind[] {
  const results: SkillFind[] = [];
  try {
    const entries = readdirSync(skillsDirPath);
    for (const entry of entries) {
      const entryPath = join(skillsDirPath, entry);
      if (!isDirectory(entryPath)) continue;
      const skill = readSkillFile(entryPath);
      if (skill) results.push(skill);
    }
  } catch {}
  return results;
}

function findAgentSkillDirs(projectRoot: string): SkillFind[] {
  const results: SkillFind[] = [];
  for (const agentDir of agentDirs) {
    const agentPath = join(projectRoot, agentDir);
    if (!isDirectory(agentPath)) continue;
    const skillsPath = join(agentPath, "skills");
    results.push(...scanSkillsDir(skillsPath));
  }
  return results;
}

export function findSkills(projectRoot: string): SkillFind[] {
  const lockMap = readSkillsLock(projectRoot);
  return findAgentSkillDirs(projectRoot).map((skill) => ({
    ...skill,
    sourceUrl: lockMap.find((entry) => entry.name === skill.name)?.sourceUrl,
  }));
}

export function mergeSkillInfo(
  skillMeta: ParseSkillMeta[],
  skillFind: SkillFind[],
): ReturnSkillInfo[] {
  const urlByName = new Map(skillFind.map((s) => [s.name, s.sourceUrl]));
  return skillMeta.map((meta) => ({
    ...meta,
    sourceUrl: urlByName.get(meta.name),
  }));
}
