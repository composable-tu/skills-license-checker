import licenseList from "spdx-license-list/full";

export const getSpdxLicenseText = (spdxId: string): string | undefined =>
  licenseList[spdxId]?.licenseText;
