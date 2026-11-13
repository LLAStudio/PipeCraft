import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { serializeProject } from "@/lib/projects/serialize";
import { officialTemplates } from "@/lib/templates/defaultTemplates";
import {
  enforceRateLimit,
  logServerError,
  readJsonBody,
  rejectCrossOrigin,
  rejectOversizedBody,
} from "@/lib/security/http";
import { GITHUB_OWNER_PATTERN, GITHUB_REPO_PATTERN, GIT_BRANCH_PATTERN, WORKFLOW_PATH_PATTERN } from "@/lib/security/repoInput";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional(),
  repoOwner: z.string().trim().max(100).regex(GITHUB_OWNER_PATTERN).optional(),
  repoName: z.string().trim().max(100).regex(GITHUB_REPO_PATTERN).optional(),
  repoBranch: z.string().trim().max(200).regex(GIT_BRANCH_PATTERN).optional(),
  filePath: z.string().trim().max(300).regex(WORKFLOW_PATH_PATTERN).optional(),
  templateId: z.string().trim().max(100).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "projects:list", 120, 60_000);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  try {
    const projects = await prisma.workflowProject.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ projects: projects.map(serializeProject) });
  } catch (error) {
    logServerError("GET /api/projects", error);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const tooLarge = rejectOversizedBody(request, 64 * 1024);
  if (tooLarge) return tooLarge;

  const limited = enforceRateLimit(request, "projects:create", 30, 60_000);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return body.response;

  const parsed = createProjectSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const template =
    officialTemplates.find((candidate) => candidate.id === input.templateId) ?? officialTemplates[0];

  if (!template) {
    return NextResponse.json({ error: "No template available" }, { status: 500 });
  }

  const graph = template.graphJson;
  const yamlContent = graphToYaml({
    nodes: graph.nodes,
    edges: graph.edges,
    globalSettings: graph.globalSettings,
    viewport: graph.viewport,
  });

  try {
    const project = await prisma.workflowProject.create({
      data: {
        userId,
        name: input.name,
        description: input.description ?? template.description,
        repoOwner: input.repoOwner ?? null,
        repoName: input.repoName ?? null,
        repoBranch: input.repoBranch ?? "main",
        filePath: input.filePath ?? ".github/workflows/ci.yml",
        graphJson: graph as unknown as object,
        yamlContent,
      },
    });

    return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
  } catch (error) {
    logServerError("POST /api/projects", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
