import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/projects/serialize";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { validateGraphSummary } from "@/lib/validation/graphValidator";
import { lintSecurity } from "@/lib/validation/securityLinter";
import type { GraphNode, ReactFlowEdge, SerializedGraph, WorkflowGlobalSettings } from "@/types/pipeline";

const saveProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  filePath: z.string().trim().min(1).max(300).optional(),
  graphJson: z.object({
    nodes: z.array(z.record(z.string(), z.unknown())),
    edges: z.array(z.record(z.string(), z.unknown())),
    globalSettings: z.record(z.string(), z.unknown()).optional(),
    viewport: z
      .object({ x: z.number(), y: z.number(), zoom: z.number() })
      .optional(),
  }),
});

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = await params;

  try {
    const project = await prisma.workflowProject.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        ...serializeProject(project),
        graphJson: project.graphJson,
        yamlContent: project.yamlContent,
      },
    });
  } catch (error) {
    console.error("[GET /api/projects/:id]", error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid graph" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const nodes = input.graphJson.nodes as unknown as GraphNode[];
  const edges = input.graphJson.edges as unknown as ReactFlowEdge[];
  const viewport = input.graphJson.viewport ?? { x: 0, y: 0, zoom: 1 };
  const globalSettings = (input.graphJson.globalSettings ?? {
    name: input.name ?? "Workflow",
    env: {},
  }) as unknown as WorkflowGlobalSettings;

  const graph: SerializedGraph = {
    name: globalSettings.name,
    nodes,
    edges,
    viewport,
    globalSettings,
    version: 1,
  };

  try {
    const existing = await prisma.workflowProject.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const summary = validateGraphSummary(nodes, edges);
    const { score } = lintSecurity(nodes, globalSettings);
    const yamlContent = graphToYaml({ nodes, edges, globalSettings, viewport });

    const project = await prisma.workflowProject.update({
      where: { id: existing.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.filePath ? { filePath: input.filePath } : {}),
        graphJson: graph as unknown as object,
        yamlContent,
        isValid: summary.isValid,
        securityScore: score,
      },
    });

    return NextResponse.json({ project: serializeProject(project), savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[PATCH /api/projects/:id]", error);
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = await params;

  try {
    const result = await prisma.workflowProject.deleteMany({
      where: { id: projectId, userId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/projects/:id]", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
