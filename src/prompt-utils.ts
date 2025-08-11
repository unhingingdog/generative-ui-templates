import type {
  LayoutButton,
  LayoutContainer,
  LayoutForm,
  LayoutInput,
  LayoutNode,
  LayoutText,
} from "./models";

export interface TemplateInstruction<T extends LayoutNode = LayoutNode> {
  usage: string;
  props: Record<keyof T, string>;
}

/* explicit map gives strong IntelliSense for authoring ------------ */
export const nodeInstructions = {
  container: {
    usage: "A logical grouping element that wraps other nodes.",
    props: {
      id: 'Must be the literal string "container".',
      children: "Array of nested UI nodes.",
    },
  } satisfies TemplateInstruction<LayoutContainer>,

  text: {
    usage: "Displays a single piece of plain text.",
    props: {
      id: 'Literal "text".',
      content: "The text the user will see.",
    },
  } satisfies TemplateInstruction<LayoutText>,

  input: {
    usage: "A free‑text question awaiting user input.",
    props: {
      id: 'Literal "input".',
      queryId: "Stable identifier used when posting back the answer.",
      query: "Prompt shown to the user.",
    },
  } satisfies TemplateInstruction<LayoutInput>,

  button: {
    usage: "A clickable option for the user to choose.",
    props: {
      id: 'Literal "button".',
      queryId: "Stable identifier used when this option is chosen.",
      query: "Label shown on the button.",
    },
  } satisfies TemplateInstruction<LayoutButton>,

  form: {
    usage: "Packages multiple inputs/buttons so they submit together.",
    props: {
      id: 'Literal "form".',
      children: "Array of `input` or `button` nodes.",
    },
  } satisfies TemplateInstruction<LayoutForm>,
} as const;

/* Convenience alias with correct type */
export type NodeInstructionMap = typeof nodeInstructions;

/* System‑prompt builder ------------------------------------------- */
export const generateSystemPrompt = (map: NodeInstructionMap): string => {
  const lines: string[] = [
    "You emit JSON that follows this Generative‑UI DSL.",
    "",
    "### Node types & how to use them",
  ];

  for (const [id, meta] of Object.entries(map) as Array<
    [keyof NodeInstructionMap, TemplateInstruction]
  >) {
    lines.push(`- **${id}**: ${meta.usage}`);
    for (const [prop, hint] of Object.entries(meta.props)) {
      lines.push(`  • \`${prop}\`: ${hint}`);
    }
  }

  lines.push(
    "",
    "### Example",
    "```json",
    JSON.stringify(
      {
        id: "container",
        children: [
          { id: "text", content: "Hello, world!" },
          {
            id: "form",
            children: [
              { id: "input", queryId: "name", query: "What is your name?" },
              { id: "button", queryId: "skip", query: "Skip" },
            ],
          },
        ],
      },
      null,
      2,
    ),
    "```",
    "",
    "Return a single root object conforming exactly to this schema.",
  );

  return lines.join("\n");
};
