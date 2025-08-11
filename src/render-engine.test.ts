/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderEngine } from "./render-engine";

// Mock telomere to return caps for *template-shaped* fragments (closers-only), and NotClosable mid-key.
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
      in: 'ton","element":"button","props":{"query":"Go',
      out: { type: "Success", cap: '"}}]}' },
    },
  ];
  let i = 0;
  return {
    initTelomere: async () => ({
      processDelta: (d: string) => {
        const step = script[i] ?? { out: { type: "NotClosable" as const } };
        // advance only when input matches planned fragment (keeps test strict)
        if (step.in === d) i++;
        return step.out;
      },
      reset: () => {
        i = 0;
      },
    }),
  };
});

// Keep validators/transform simple so we assert render-engine behavior.
// Validator: accept anything (engine logic is under test, not schema here).
vi.mock("../src/telomere/template-validators", () => ({
  assertLayoutNode: (_x: unknown) => {},
}));
// Transform: identity for fields used by renderToDOM (id/element/props/children).
vi.mock("../src/telomere/template-model-transform", () => ({
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

  it("appends frames on (1) first closable, (2) value-string partials, (3) cap advance, marks optimistic only on NotClosable", async () => {
    const engine = await createRenderEngine(root);

    // D1: open container+array → closable with "]}"
    engine.next('{"id":"container","element":"div","children":[');
    expect(root.childElementCount).toBe(1);
    let snap = root.lastElementChild as HTMLElement;
    expect(snap.dataset.optimistic).toBeUndefined();
    expect(snap.classList.contains("generative-ui-container")).toBe(true);

    // D2: first child, value string partial ("he") → still closable (adds quote+closers)
    engine.next('{"id":"text","element":"p","props":{"content":"he');
    expect(root.childElementCount).toBe(2);
    snap = root.lastElementChild as HTMLElement;
    expect(snap.dataset.optimistic).toBeUndefined();
    // text node present (class based on id)
    expect(snap.querySelector(".generative-ui-text")).toBeTruthy();

    // D3: finish "hello" and child → closable (cap closes array+root)
    engine.next('llo"}}');
    expect(root.childElementCount).toBe(3);
    snap = root.lastElementChild as HTMLElement;
    expect(snap.dataset.optimistic).toBeUndefined();
    expect(snap.querySelector("p")?.textContent).toBe("hello");

    // D4: start next child mid-key → NotClosable → optimistic frame
    engine.next(',{"id":"but');
    expect(root.childElementCount).toBe(4);
    snap = root.lastElementChild as HTMLElement;
    expect(snap.dataset.optimistic).toBe("true");
    // still last stable DOM (no button yet)
    expect(snap.querySelector(".generative-ui-button")).toBeFalsy();

    // D5: complete button (value string partial) → closable → non-optimistic frame
    engine.next('ton","element":"button","props":{"query":"Go');
    expect(root.childElementCount).toBe(5);
    snap = root.lastElementChild as HTMLElement;
    expect(snap.dataset.optimistic).toBeUndefined();
    expect(snap.querySelector(".generative-ui-button")).toBeTruthy();
    expect(snap.querySelector("button")?.textContent).toBe("Go");
  });

  it("does not append when an unrelated noop delta arrives", async () => {
    const engine = await createRenderEngine(root);
    engine.next('{"id":"container","element":"div","children":['); // frame 1
    const before = root.childElementCount;
    engine.next("   "); // mock treats as NotClosable; tail unchanged → engine should no-op
    expect(root.childElementCount).toBe(before);
  });

  it("reset clears identity so the next fragment restarts the stream", async () => {
    const engine = await createRenderEngine(root);
    engine.next('{"id":"container","element":"div","children":[');
    engine.reset();
    const before = root.childElementCount;
    engine.next('{"id":"container","element":"div","children":[');
    expect(root.childElementCount).toBe(before + 1);
  });
});
