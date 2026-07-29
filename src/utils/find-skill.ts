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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { agentDirs } from "../config/agent-dirs.ts";
import { findLicenseFile } from "./find-license.ts";
import { readSkillsLock } from "./parse-vercel-skills-lock.ts";
import type { ParseSkillMeta } from "./parse-skill-front.ts";
import { getSpdxLicenseText } from "./spdx-license.ts";

/** Exported types */
export interface ReturnSkillInfo {
  name: string;
  description: string;
  license?: string;
  author?: string;
  version?: string;
  sourceUrl?: string;
  licenseContent?: string;
}

export interface SkillFind {
  name: string;
  content: string;
  sourceUrl?: string;
  licenseContent?: string;
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
    return {
      name: basename(skillDirPath),
      content,
      licenseContent: findLicenseFile(skillDirPath),
    };
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
  const seen = new Set<string>();
  return findAgentSkillDirs(projectRoot)
    .filter((skill) => {
      if (seen.has(skill.name)) return false;
      seen.add(skill.name);
      return true;
    })
    .map((skill) => ({
      ...skill,
      sourceUrl: lockMap.find((entry) => entry.name === skill.name)?.sourceUrl,
    }));
}

const resolveLicenseContent = (
  licenseContent: string | undefined,
  spdxId: string | undefined,
): string | undefined => licenseContent ?? (spdxId ? getSpdxLicenseText(spdxId) : undefined);

export function mergeSkillInfo(
  skillMeta: ParseSkillMeta[],
  skillFind: SkillFind[],
  includeLicenseContent = false,
): ReturnSkillInfo[] {
  const findByName = new Map(skillFind.map((s) => [s.name, s]));
  return skillMeta.map((meta) => {
    const found = findByName.get(meta.name);
    const sourceUrl = found?.sourceUrl;
    const licenseContent = includeLicenseContent
      ? resolveLicenseContent(found?.licenseContent, meta.license)
      : undefined;
    const result: ReturnSkillInfo = { ...meta, sourceUrl: sourceUrl };
    if (licenseContent) result.licenseContent = licenseContent;
    return result;
  });
}
