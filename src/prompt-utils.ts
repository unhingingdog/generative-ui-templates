import type {
  LayoutButton,
  LayoutContainer,
  LayoutForm,
  LayoutInput,
  LayoutNode,
  LayoutText,
} from "./template-models";

export interface TemplateInstruction<T extends LayoutNode = LayoutNode> {
  usage: string;
  props: Record<keyof T, string>;
}

export const nodeInstructions = {
  container: {
    usage:
      "Group other nodes. Use sparingly; prefer a single root container with nested content.",
    props: {
      id: "Literal 'container'.",
      children:
        "Array of child nodes (container | text | input | button | form). Keep the tree shallow and meaningful.",
    },
  } as const satisfies TemplateInstruction<LayoutContainer>,

  text: {
    usage:
      "Static text content. Use for headings, paragraphs, labels. No Markdown; plain strings only.",
    props: {
      id: "Literal 'text'.",
      content:
        "Required string. Short, user-facing copy. Do not include code fences or JSON.",
    },
  } as const satisfies TemplateInstruction<LayoutText>,

  input: {
    usage:
      "Single-line text input bound to a query. Pair with a button or within a form.",
    props: {
      id: "Literal 'input'.",
      queryId:
        "Stable identifier for binding. Snake/kebab or camelCase is fine; do not change across updates.",
      query:
        "User-facing label/prompt for the input. Keep concise (<= 80 chars).",
    },
  } as const satisfies TemplateInstruction<LayoutInput>,

  button: {
    usage:
      "Action button that submits the bound queryId. Keep labels short and descriptive.",
    props: {
      id: "Literal 'button'.",
      queryId:
        "Must match an existing input's queryId if used together; otherwise defines an action key.",
      query:
        "User-facing label for the action (e.g., 'Search', 'Send'). No emojis.",
    },
  } as const satisfies TemplateInstruction<LayoutButton>,

  form: {
    usage:
      "Scoped set of inputs and buttons that submit together. Children may ONLY be 'input' or 'button'.",
    props: {
      id: "Literal 'form'.",
      children:
        "Array of 'input' and 'button' nodes only. No nesting of other forms or containers.",
    },
  } as const satisfies TemplateInstruction<LayoutForm>,
} as const;

export type NodeInstructionMap = typeof nodeInstructions;

export const generateSystemPrompt = (
  domainInstructions: string,
  map: NodeInstructionMap = nodeInstructions,
): string => {
  const lines: string[] = [
    domainInstructions,
    "",
    "You emit JSON that follows this Generative-UI DSL.",
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
    "### Rules",
    "- Output ONLY a single JSON object that matches the schema exactly.",
    "- No prose, no Markdown, no backticks, no code fences.",
    "- Keep copy concise and human-friendly.",
  );

  lines.push(
    "",
    "You are to conduct a dialogue with the user.",
    `Given you cannot reply with plain text, you may construt one, 
    with a UI template that includes a form with one or more inputs (Button can also be an input).`,
    "",
    "The user will respond by submitting a JSON payload, with their answer as a value and your the query input/button id as the key.",
  );

  lines.push(
    "",
    "### Minimal example",
    "```json",
    JSON.stringify(
      {
        id: "container",
        children: [
          { id: "text", content: "Build your salad" },
          {
            id: "form",
            children: [
              {
                id: "input",
                queryId: "protein",
                query: "What protein do you want?",
              },
              {
                id: "input",
                queryId: "garnish",
                query: "What garnish do you want?",
              },
              {
                id: "input",
                queryId: "delivery-date",
                query: "When do you want it delivered?",
              },
              { id: "button", query: "Submit" },
            ],
          },
        ],
      },
      null,
      2,
    ),
    "```",
  );

  lines.push(
    "",
    "The user would respond with something like:",
    "```json",
    JSON.stringify(
      {
        protein: "fish",
        garnish: "italian parsley",
        "delivery-date": "in two hours",
      },
      null,
      2,
    ),
    "```",
  );

  return lines.join("\n");
};

export const defaultSystemPrompt = generateSystemPrompt(
  "The topic is anything.",
  nodeInstructions,
);
