import { parse as parseYaml } from "yaml";

export interface ParsedActionYaml {
  name?: string | undefined;
  description?: string | undefined;
  author?: string | undefined;
  branding?:
    | {
        color: string;
        icon: string;
      }
    | undefined;
  inputs: Record<
    string,
    {
      description?: string | undefined;
      required?: boolean | undefined;
      deprecationNotice?: string | undefined;
      default?: string | undefined;
      type?: string | undefined;
      options?: string[] | undefined;
    }
  >;
  outputs: Record<string, { description?: string | undefined }>;
  examples?: unknown[] | undefined;
}

export function parseActionYaml(yamlContent: string): ParsedActionYaml {
  try {
    const parsed = parseYaml(yamlContent) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return { inputs: {}, outputs: {} };

    return {
      name: parsed.name as string | undefined,
      description: parsed.description as string | undefined,
      author: parsed.author as string | undefined,
      branding:
        parsed.branding && typeof parsed.branding === "object"
          ? parsed.branding as ParsedActionYaml["branding"]
          : undefined,
      inputs:
        parsed.inputs && typeof parsed.inputs === "object"
          ? Object.fromEntries(
              Object.entries(parsed.inputs as Record<string, unknown>).map(
                ([key, value]) => [
                  key,
                  {
                    description:
                      (value as Record<string, unknown>)?.description as string | undefined,
                    required: (value as Record<string, unknown>)?.required as boolean | undefined,
                    deprecationNotice:
                      (value as Record<string, unknown>)?.deprecationNotice as string | undefined,
                    default:
                      (value as Record<string, unknown>)?.default as string | undefined,
                    type:
                      (value as Record<string, unknown>)?.type as string | undefined,
                    options:
                      (value as Record<string, unknown>)?.options as string[] | undefined,
                  },
                ],
              ),
            )
          : {},
      outputs:
        parsed.outputs && typeof parsed.outputs === "object"
          ? Object.fromEntries(
              Object.entries(parsed.outputs as Record<string, unknown>).map(([key, value]) => [
                key,
                { description: (value as Record<string, unknown>)?.description as string | undefined },
              ]),
            )
          : {},
      examples: parsed.examples as unknown[] | undefined,
    };
  } catch (err) {
    console.error("[parseActionYaml] Failed to parse:", err);
    return { inputs: {}, outputs: {} };
  }
}
