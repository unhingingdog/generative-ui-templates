import z from "zod";
import type { LayoutNode } from "./template-models";

// TODO: important - we want to allow partial JSON, becuase of the imcomplete JSON closing code (telomere), so the text and children fields
// always need to come last, becuase these are the only fields that can be closed off and then subsequently parsed by renderInternal.
//
const LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.discriminatedUnion("id", [
    z.object({
      id: z.literal("container"),
      children: z.array(LayoutNodeSchema),
    }),
    z.object({ id: z.literal("text"), content: z.string() }),
    z.object({
      id: z.literal("input"),
      queryId: z.string(),
      query: z.string(),
    }),
    z.object({
      id: z.literal("button"),
      queryId: z.string(),
      query: z.string(),
    }),
    z.object({
      id: z.literal("form"),
      children: z.array(
        z.discriminatedUnion("id", [
          z.object({
            id: z.literal("input"),
            queryId: z.string(),
            query: z.string(),
          }),
          z.object({
            id: z.literal("button"),
            queryId: z.string(),
            query: z.string(),
          }),
        ]),
      ),
    }),
  ]),
);

//validation issue. I want

export function assertLayoutNode(o: unknown): asserts o is LayoutNode {
  LayoutNodeSchema.parse(o);
}
