import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { serializeProject } from "@/lib/projects/serialize";
import { officialTemplates } from "@/lib/templates/defaultTemplates";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional(),
  repoOwner: z.string().trim().max(100).optional(),
  repoName: z.string().trim().max(100).optional(),
  repoBranch: z.string().trim().max(100).optional(),
  filePath: z.string().trim().max(300).optional(),
  templateId: z.string().trim().max(100).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export async function GET() {
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
    console.error("[GET /api/projects]", error);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(payload);
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
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
