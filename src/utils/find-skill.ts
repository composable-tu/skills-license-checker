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
import { resolveLicense, type ResolvedLicense } from "./spdx-license.ts";

/** A single license resolved to its full text. */
export interface LicenseInfo {
  hash: string;
  name: string;
  spdxId?: string;
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
  const result: SkillFind[] = [];
  try {
    for (const entry of readdirSync(skillsDirPath)) {
      const entryPath = join(skillsDirPath, entry);
      if (!isDirectory(entryPath)) continue;
      const skill = readSkillFile(entryPath);
      if (skill) result.push(skill);
    }
  } catch {
    return [];
  }
  return result;
}

function findAgentSkillDirs(projectRoot: string): SkillFind[] {
  const result: SkillFind[] = [];
  for (const agentDir of agentDirs) {
    const skillsPath = join(projectRoot, agentDir, "skills");
    if (!isDirectory(skillsPath)) continue;
    result.push(...scanSkillsDir(skillsPath));
  }
  return result;
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

/** The licenses a skill resolves to. */
interface SkillLicenses {
  primaryLicense?: string;
  hashes: string[];
}

/**
 * Build the single authoritative entry from a LICENSE file bundled with the
 * skill. The file text wins; the entry is named after the first recognized
 * SPDX id in the declaration (or a generic "License" when none resolves).
 */
export function fileEntry(declaration: string, fileText: string): ResolvedLicense[] {
  const [first] = resolveLicense(declaration);
  return [{ spdxId: first?.spdxId, name: first?.spdxId ? first.name : "License", text: fileText }];
}

/**
 * Resolve, hash, and register every license a skill provides.
 *
 * A LICENSE file shipped with the skill is authoritative and yields one entry
 * (see {@link fileEntry}); otherwise every license named in the declaration is
 * resolved via {@link resolveLicense}. Each license's SHA-256 text hash is
 * registered into the shared map, keeping the first occurrence of each hash.
 * Returns the primary license (the first resolved SPDX id, or the raw
 * declaration) and the hash list.
 */
export function collectSkillLicenses(
  meta: ParseSkillMeta,
  found: SkillFind | undefined,
  licenses: Map<string, LicenseInfo>,
): SkillLicenses {
  const declaration = meta.license ?? "";
  const resolved = found?.licenseContent
    ? fileEntry(declaration, found.licenseContent)
    : resolveLicense(declaration);

  const hashes = resolved.map(({ spdxId, name, text }) => {
    const hash = createHash("sha256").update(text).digest("hex");
    if (!licenses.has(hash)) {
      licenses.set(hash, { hash, name, spdxId, content: text });
    }
    return hash;
  });

  const primarySpdxId = resolved.find((entry) => entry.spdxId)?.spdxId;
  const primaryLicense = primarySpdxId ?? (declaration || undefined);

  return { primaryLicense, hashes };
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
    const { primaryLicense, hashes } = collectSkillLicenses(meta, found, licenses);

    return {
      name: meta.name,
      description: meta.description,
      license: primaryLicense,
      licenses: hashes,
      author: meta.author,
      version: meta.version,
      sourceUrl: found?.sourceUrl,
    };
  });

  const licensesRecord = Object.fromEntries(
    Array.from(licenses.entries()).map(([hash, info]) => [
      hash,
      includeLicenseContent ? info : { ...info, content: "" },
    ]),
  );

  return { skills, licenses: licensesRecord };
}
