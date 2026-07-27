import { readFileSync } from "node:fs";
import { join } from "node:path";
import gitUrlParse from "git-url-parse";

/** Exported types */
export interface ParseSkillLock {
  name: string;
  sourceUrl?: string;
}

const LOCK_FILE = "skills-lock.json";

interface LocalSkillLockEntry {
  source: string;
  sourceUrl?: string;
  sourceType?: string;
}

interface LocalSkillLockFile {
  version?: number;
  skills: Record<string, LocalSkillLockEntry>;
}

function resolveSourceUrl(entry: LocalSkillLockEntry): string | undefined {
  switch (entry.sourceType) {
    case "github":
      return `https://github.com/${entry.source}`;
    case "git":
    case "gitlab":
      return entry.sourceUrl ? gitUrlParse(entry.sourceUrl).toString("https") : undefined;
    default:
      return undefined;
  }
}

export function readSkillsLock(projectRoot: string): ParseSkillLock[] {
  const lockPath = join(projectRoot, LOCK_FILE);
  try {
    const content = readFileSync(lockPath, "utf-8");
    const parsed: LocalSkillLockFile = JSON.parse(content);
    if (!parsed.skills) return [];
    const result: ParseSkillLock[] = [];
    for (const [name, entry] of Object.entries(parsed.skills)) {
      const url = resolveSourceUrl(entry);
      if (url) result.push({ name, sourceUrl: url });
    }
    return result;
  } catch {
    return [];
  }
}
