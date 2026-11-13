import { z } from "zod";

/**
 * GitHub identifiers are far more restrictive than "any string". Validating
 * them keeps user input out of URL paths and git refs where traversal or
 * injection could redirect an API call to another repository.
 */
export const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const GITHUB_REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
export const GIT_BRANCH_PATTERN = /^(?!.*\.\.)[A-Za-z0-9._/-]{1,200}$/;
export const WORKFLOW_FILE_PATTERN = /^[A-Za-z0-9._-]{1,120}\.ya?ml$/;
export const WORKFLOW_PATH_PATTERN = /^\.github\/workflows\/[A-Za-z0-9._-]{1,120}\.ya?ml$/;

export const MAX_WORKFLOW_BYTES = 512 * 1024;

export const ownerSchema = z
  .string()
  .trim()
  .regex(GITHUB_OWNER_PATTERN, "Invalid repository owner");
export const repoSchema = z
  .string()
  .trim()
  .regex(GITHUB_REPO_PATTERN, "Invalid repository name");
export const branchSchema = z
  .string()
  .trim()
  .regex(GIT_BRANCH_PATTERN, "Invalid branch name");
export const workflowPathSchema = z
  .string()
  .trim()
  .max(300)
  .regex(WORKFLOW_PATH_PATTERN, "Workflow path must be .github/workflows/<name>.yml");
export const workflowFileNameSchema = z
  .string()
  .trim()
  .regex(WORKFLOW_FILE_PATTERN, "Invalid workflow file name");

export const repoRefSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  branch: branchSchema.optional(),
});

export const publishSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  branch: branchSchema.optional(),
  filePath: workflowPathSchema,
  yamlContent: z
    .string()
    .min(1, "Workflow content is required")
    .max(MAX_WORKFLOW_BYTES, "Workflow file is too large"),
  commitMessage: z.string().trim().max(200).optional(),
  mode: z.enum(["direct_commit", "pull_request"]).optional(),
  prTitle: z.string().trim().max(200).optional(),
  prBody: z.string().trim().max(5000).optional(),
});

export const dispatchSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  workflowFileName: workflowFileNameSchema,
  branch: branchSchema.optional(),
});
