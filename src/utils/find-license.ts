import { readFileSync } from "node:fs";
import { join } from "node:path";

const LICENSE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE"] as const;

export const findLicenseFile = (dirPath: string): string | undefined => {
  for (const fileName of LICENSE_FILES) {
    try {
      return readFileSync(join(dirPath, fileName), "utf-8");
    } catch {}
  }
  return undefined;
};
