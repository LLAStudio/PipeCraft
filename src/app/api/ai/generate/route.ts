import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    const mutations = analyzePrompt(prompt);
    return NextResponse.json({ success: true, mutations, message: `Applied ${mutations.length} change(s).` });
  } catch (error) {
    console.error("[POST /api/ai/generate]", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}

function analyzePrompt(_prompt: string): Array<{ type: "ADD_JOB"; data?: Record<string, unknown>; description: string; }> {
  return [];
}
