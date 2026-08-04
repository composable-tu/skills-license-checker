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

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { agentDirs } from "../config/agent-dirs.ts";
import { findLicenseFile } from "./find-license.ts";
import { readSkillsLock } from "./parse-vercel-skills-lock.ts";
import type { ParseSkillMeta } from "./parse-skill-front.ts";
import {
  getSpdxLicenseName,
  getSpdxLicenseText,
  resolveSpdxId,
  resolveSpdxIds,
} from "./spdx-license.ts";

/** A single license resolved to its full text. */
export interface LicenseInfo {
  hash: string;
  name: string;
  spdxId: string;
  content: string;
}

/** A skill entry within a license report. */
export interface SkillInfo {
  name: string;
  description: string;
  license?: string;
  licenses: string[];
  author?: string;
  version?: string;
  sourceUrl?: string;
}

export interface SkillLicenseReport {
  skills: SkillInfo[];
  licenses: Record<string, LicenseInfo>;
}

/** A raw skill found on disk, before front matter is parsed. */
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
  try {
    return {
      name: basename(skillDirPath),
      content: readFileSync(join(skillDirPath, SKILL_FILE), "utf-8"),
      licenseContent: findLicenseFile(skillDirPath),
    };
  } catch {
    return undefined;
  }
}

function scanSkillsDir(skillsDirPath: string): SkillFind[] {
  try {
    return readdirSync(skillsDirPath)
      .map((entry) => join(skillsDirPath, entry))
      .filter(isDirectory)
      .map(readSkillFile)
      .filter((skill): skill is SkillFind => skill !== undefined);
  } catch {
    return [];
  }
}

function findAgentSkillDirs(projectRoot: string): SkillFind[] {
  return agentDirs
    .map((agentDir) => join(projectRoot, agentDir, "skills"))
    .filter(isDirectory)
    .flatMap(scanSkillsDir);
}

export function findSkills(projectRoot: string): SkillFind[] {
  const sourceByName = new Map(
    readSkillsLock(projectRoot).map((entry) => [entry.name, entry.sourceUrl]),
  );
  const seen = new Set<string>();

  return findAgentSkillDirs(projectRoot)
    .filter((skill) => {
      if (seen.has(skill.name)) return false;
      seen.add(skill.name);
      return true;
    })
    .map((skill) => ({ ...skill, sourceUrl: sourceByName.get(skill.name) }));
}

/* ----------------------------- License report ---------------------------- */

const contentHash = (text: string): string => createHash("sha256").update(text).digest("hex");

/** A license whose full text is known, before hashing. */
interface ResolvedLicense {
  spdxId: string;
  name: string;
  text: string;
}

/**
 * Resolve the license text a skill provides.
 *
 * A LICENSE file shipped with the skill is authoritative and yields a single
 * entry. Otherwise every SPDX id named in the declaration is resolved against
 * the canonical SPDX license list.
 */
function resolveLicenses(
  declaration: string | undefined,
  fileText: string | undefined,
): ResolvedLicense[] {
  if (fileText) {
    return [{ spdxId: resolveSpdxId(declaration ?? "") ?? "", name: "License", text: fileText }];
  }
  return resolveSpdxIds(declaration ?? "").map((spdxId) => ({
    spdxId,
    name: getSpdxLicenseName(spdxId) ?? spdxId,
    text: getSpdxLicenseText(spdxId) ?? "",
  }));
}

/**
 * Wrap a resolved license in a report entry.
 *
 * The hash is the SHA-256 of the full text, so identical text collapses into
 * one shared entry while distinct text stays separate — even under the same
 * SPDX id.
 */
function toLicenseInfo({ spdxId, name, text }: ResolvedLicense): LicenseInfo {
  return { hash: contentHash(text), name, spdxId, content: text };
}

/** The primary license of a skill: its first known SPDX id, or the raw declaration. */
const primaryLicense = (declaration: string | undefined): string | undefined =>
  declaration ? (resolveSpdxId(declaration) ?? declaration) : undefined;

/** Register entries into a shared map, keeping the first occurrence of each hash. */
function registerLicenses(
  map: Map<string, LicenseInfo>,
  entries: LicenseInfo[],
  includeContent: boolean,
): void {
  for (const entry of entries) {
    if (!map.has(entry.hash)) {
      map.set(entry.hash, includeContent ? entry : { ...entry, content: "" });
    }
  }
}

export function mergeSkillInfo(
  skillMeta: ParseSkillMeta[],
  skillFind: SkillFind[],
  includeLicenseContent = false,
): SkillLicenseReport {
  const byName = new Map(skillFind.map((skill) => [skill.name, skill]));
  const licenses = new Map<string, LicenseInfo>();

  const skills = skillMeta.map((meta) => {
    const found = byName.get(meta.name);
    const entries = resolveLicenses(meta.license, found?.licenseContent).map(toLicenseInfo);
    registerLicenses(licenses, entries, includeLicenseContent);

    return {
      name: meta.name,
      description: meta.description,
      license: primaryLicense(meta.license),
      licenses: entries.map((entry) => entry.hash),
      author: meta.author,
      version: meta.version,
      sourceUrl: found?.sourceUrl,
    };
  });

  return { skills, licenses: Object.fromEntries(licenses) };
}
