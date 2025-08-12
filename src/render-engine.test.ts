/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderEngine } from "./render-engine";

// Mock telomere: scripted fragments for streaming test + a fallback that treats any full-form doc as closable.
vi.mock("telomere", () => {
  const script = [
    // D1
    {
      in: '{"id":"container","element":"div","children":[',
      out: { type: "Success", cap: "]}" },
    },
    // D2
    {
      in: '{"id":"text","element":"p","props":{"content":"he',
      out: { type: "Success", cap: '"}}]}' },
    },
    // D3
    { in: 'llo"}}', out: { type: "Success", cap: "]}" } },
    // D4 (mid-key in next child)
    { in: ',{"id":"but', out: { type: "NotClosable" } },
    // D5
    {
      in: 'ton","element":"button","props":{"content":"click me"}}]}',
      out: { type: "Success", cap: "" },
    },
  ];
  let i = 0;
  return {
    initTelomere: async () => ({
      processDelta: (d: string) => {
        // Allow a one-shot full form template to be treated as already closable
        if (d.includes('"element":"form"'))
          return { type: "Success", cap: "" as const };
        const step = script[i] ?? { out: { type: "NotClosable" as const } };
        if (step.in === d) i++;
        return step.out;
      },
      reset: () => {
        i = 0;
      },
    }),
  };
});

// Validators/transform kept minimal for engine-focused tests
vi.mock("./template-validators", () => ({
  assertLayoutNode: (_x: unknown) => { },
}));
vi.mock("./template-model-transform", () => ({
  transformLayoutTemplateToWebTemplate: (tmpl: any) => tmpl,
  classNameFromTemplateId: (tid: string) => `generative-ui-${tid}`,
  getTemplateClassName: (tid: string) => `generative-ui-${tid}`,
}));

describe("render-engine template-stream integration (fragmented JSON)", () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  it("appends frames on (1) first closable, (2) value-string partial advance, marks optimistic only on NotClosable", async () => {
    const engine = await createRenderEngine(root);

    // D1
    engine.next('{"id":"container","element":"div","children":[');
    expect(root.childElementCount).toBe(1);
    const first = root.firstElementChild!;
    expect(first.className).toBe("generative-ui-container");

    // D2
    engine.next('{"id":"text","element":"p","props":{"content":"he');
    expect(root.childElementCount).toBe(1);
    expect(first.querySelector("p")?.textContent).toBe("he");

    // D3
    engine.next('llo"}}');
    expect(first.querySelector("p")?.textContent).toBe("hello");

    // D4 (no new frame)
    const before = root.childElementCount;
    engine.next(',{"id":"but');
    expect(root.childElementCount).toBe(before);

    // D5
    engine.next('ton","element":"button","props":{"content":"click me"}}]}');
    const kids = first.children;
    expect(kids.length).toBe(2);
    expect(kids[0].tagName.toLowerCase()).toBe("p");
    expect(kids[1].tagName.toLowerCase()).toBe("button");
    expect((kids[1] as HTMLButtonElement).textContent).toBe("click me");
  });

  it("wires onSubmit callback and sends full payload with input + submitter button", async () => {
    const root = document.getElementById("root")!;
    const onSubmit = vi.fn();
    const engine = await createRenderEngine(root, onSubmit);
    engine.reset();

    const fullForm = JSON.stringify({
      id: "form",
      element: "form",
      children: [
        {
          id: "input",
          element: "input",
          props: { queryId: "q", query: "Search…" },
        },
        {
          id: "button",
          element: "button",
          props: { queryId: "submit", query: "submit" },
        },
      ],
    });

    engine.next(fullForm);

    const form = root.querySelector("form") as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const btn = form.querySelector("button") as HTMLButtonElement;

    input.value = "hello";
    btn.click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ q: "hello", submit: "submit" });
  });
});
