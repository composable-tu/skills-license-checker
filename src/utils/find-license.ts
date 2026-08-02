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

import { readFileSync } from "node:fs";
import { join } from "node:path";

const LICENSE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE"] as const;

export const findLicenseFile = (dirPath: string): string | undefined => {
  for (const fileName of LICENSE_FILES) {
    try {
      return readFileSync(join(dirPath, fileName), "utf-8");
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
  }
  return undefined;
};
