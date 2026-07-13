import { execFileSync } from "node:child_process";
import { countBucket } from "./buckets.js";

export type GitMetadata = {
  repo_size_bucket: string;
  file_count_bucket: string;
  changed_file_count_bucket: string;
  lines_added_bucket: string;
  lines_removed_bucket: string;
};

export function collectGitMetadata(projectPath: string): GitMetadata {
  runGit(projectPath, ["rev-parse", "--is-inside-work-tree"]);
  const trackedFiles = splitNullDelimited(runGit(projectPath, ["ls-files", "-z"]));
  const diffLines = runGit(projectPath, ["diff", "--numstat", "HEAD", "--"])
    .split(/\r?\n/)
    .filter(Boolean);
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of diffLines) {
    const [added, removed] = line.split("\t");
    if (added !== "-") linesAdded += Number(added) || 0;
    if (removed !== "-") linesRemoved += Number(removed) || 0;
  }

  return {
    repo_size_bucket: countBucket(trackedFiles.length),
    file_count_bucket: countBucket(trackedFiles.length),
    changed_file_count_bucket: countBucket(diffLines.length),
    lines_added_bucket: countBucket(linesAdded),
    lines_removed_bucket: countBucket(linesRemoved),
  };
}

function runGit(projectPath: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", projectPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Unable to read git metadata for project: ${projectPath}`);
  }
}

function splitNullDelimited(value: string): string[] {
  return value.split("\0").filter(Boolean);
}
