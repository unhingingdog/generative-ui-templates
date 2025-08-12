import { Agent, type JsonSchemaDefinition } from "@openai/agents";
import z from "zod";
import { LayoutNodeSchema } from "./template-validators.ts";
import { generateSystemPrompt } from "./prompt-utils.ts";

const raw = z.toJSONSchema(LayoutNodeSchema) as any;
const layoutObjectSchema = { ...raw, type: "object" } as const;

export const layoutOutputSpec: JsonSchemaDefinition = {
  type: "json_schema",
  name: "LayoutNode",
  schema: layoutObjectSchema,
  strict: true,
};

export const setupTestAgent = (
  systemPrompt: string = generateSystemPrompt(
    "You are a helpful airline booking assistant",
  ),
) => {
  return new Agent({
    name: "Generative UI Agent",
    instructions: systemPrompt,
    outputType: layoutOutputSpec,
    modelSettings: { temperature: 0, toolChoice: "none" },
  });
};
