import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type VerificationKind = "tests" | "build" | "lint";

export type VerificationResult = {
  kind: VerificationKind;
  outcome: "passed" | "failed";
  exit_code: number;
  duration_seconds: number;
};

export async function runVerificationCommand(
  kind: VerificationKind,
  command: string,
  cwd?: string,
): Promise<VerificationResult> {
  const startedAt = Date.now();
  try {
    await execAsync(command, {
      cwd,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return result(kind, "passed", 0, startedAt);
  } catch (error) {
    const exitCode = error && typeof error === "object" && "code" in error && typeof error.code === "number"
      ? error.code
      : 1;
    return result(kind, "failed", exitCode, startedAt);
  }
}

function result(
  kind: VerificationKind,
  outcome: "passed" | "failed",
  exitCode: number,
  startedAt: number,
): VerificationResult {
  return {
    kind,
    outcome,
    exit_code: exitCode,
    duration_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
  };
}
