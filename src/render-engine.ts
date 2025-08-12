import { initTelomere } from "telomere";
import { transformLayoutTemplateToWebTemplate } from "./template-model-transform";
import { assertLayoutNode } from "./template-validators";

import type {
  LayoutButton,
  LayoutContainer,
  LayoutForm,
  LayoutInput,
  LayoutNode,
  LayoutText,
} from "./template-models";
import type {
  RenderButton,
  RenderContainer,
  RenderForm,
  RenderInput,
  RenderNode,
  RenderText,
} from "./web-render-models";

export type RenderEngine = {
  next(delta: string): void;
  template(): LayoutNode | null;
  render(): RenderNode | null;
  reset(): void;
};

export function toRender(node: LayoutContainer): RenderContainer;
export function toRender(node: LayoutText): RenderText;
export function toRender(node: LayoutInput): RenderInput;
export function toRender(node: LayoutButton): RenderButton;
export function toRender(node: LayoutForm): RenderForm;
export function toRender(node: LayoutNode): RenderNode {
  return transformLayoutTemplateToWebTemplate(node);
}

export const getTemplateClassName = (templateId: string): string =>
  `generative-ui-${templateId}`;

function createEl(node: RenderNode): HTMLElement {
  const el = document.createElement(node.element ?? "div");
  el.classList.add(getTemplateClassName(String(node.id)));
  return el;
}

function renderToDOM(node: RenderNode): HTMLElement {
  const el = createEl(node);
  const props: any = node.props ?? {};
  switch (node.id) {
    case "text":
      el.textContent = props.content ?? (node as any).content ?? "";
      break;
    case "input":
      if (props.queryId) el.setAttribute("name", props.queryId);
      if (props.query) el.setAttribute("placeholder", props.query);
      break;
    case "button":
      el.textContent = props.query ?? "Submit";
      break;
  }
  const children = (node as any).children as RenderNode[] | undefined;
  if (children) for (const c of children) el.appendChild(renderToDOM(c));
  return el;
}

// FNV-1a 32-bit (non-crypto) hash for the streaming tail
function fnv1a32(s: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

export async function createRenderEngine(
  root: HTMLElement,
): Promise<RenderEngine> {
  let raw = "";
  let lastCap = "";
  let lastTailHash = 0;
  let version = 0;

  let tmpl: LayoutNode | null = null;
  let renderModel: RenderNode | null = null;

  const { processDelta, reset: resetTelomere } = await initTelomere();

  console.log("success init render engine", root);

  const next = (delta: string): void => {
    raw += delta;

    console.log("recv delta ", delta);
    console.log("raw is ", raw);

    const r: any = processDelta(delta);
    const capped: string =
      r && r.type !== "NotClosable" && typeof r.cap === "string"
        ? r.cap
        : lastCap;

    console.log("teomere is ", r);

    console.log("capped is", capped);

    // Determine tail beyond the stable cap
    let tail = "";
    if (capped && raw.startsWith(capped)) {
      tail = raw.slice(capped.length);
    } else if (!capped) {
      tail = raw;
    } else {
      tail = raw.slice(Math.min(capped.length, raw.length));
    }

    const capChanged = capped !== lastCap;
    const tailHash = fnv1a32(tail);
    const tailChanged = tailHash !== lastTailHash;

    if (!capChanged && !tailChanged) return;

    console.log("change detected");

    version++;

    if (capChanged) {
      try {
        const candidate = JSON.parse(capped) as unknown;
        console.log("raw template is", candidate);
        assertLayoutNode(candidate);
        console.log("passed validation");
        tmpl = candidate as LayoutNode;
        renderModel = toRender(tmpl);
        console.log("successfully transformed to render template", renderModel);
        lastCap = capped;
      } catch {
        // keep old renderModel; try again on next tick
        console.log("failed");
      }
    }

    if (!renderModel) return;

    const el = renderToDOM(renderModel);

    console.log("generated element", el);

    const optimistic = tail.length > 0;
    if (optimistic) el.dataset.optimistic = "true";
    el.dataset.version = String(version);

    // Append the new snapshot to the provided root
    root.appendChild(el);

    lastTailHash = tailHash;
  };

  const reset = () => {
    raw = "";
    lastCap = "";
    lastTailHash = 0;
    version = 0;
    tmpl = null;
    renderModel = null;

    if (root.firstChild) {
      root.removeChild(root?.firstChild);
    }

    resetTelomere();
  };

  return { next, template: () => tmpl, render: () => renderModel, reset };
}
