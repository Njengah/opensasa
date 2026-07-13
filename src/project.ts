import { createHash } from "node:crypto";
import { resolve } from "node:path";

const projectIdentityHashPattern = /^[a-f0-9]{64}$/;

export function hashProjectIdentity(projectPath: string): string {
  const normalized = resolve(projectPath).replaceAll("\\", "/").toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function isProjectIdentityHash(value: string): boolean {
  return projectIdentityHashPattern.test(value);
}
