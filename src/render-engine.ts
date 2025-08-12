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

export type FormSubmit = <T>(payload: Record<string, T>) => void;

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
export function toRender(node: LayoutNode): RenderNode;
export function toRender(node: LayoutNode): RenderNode {
  return transformLayoutTemplateToWebTemplate(node);
}

export const getTemplateClassName = (templateId: string): string =>
  `generative-ui-${templateId}`;

function createEl(node: RenderNode): HTMLElement {
  const el = document.createElement((node as any).element ?? "div");
  const id = (node as any).id as string;
  el.classList.add(getTemplateClassName(id));
  return el;
}

function renderToDOM(node: RenderNode, onSubmit?: FormSubmit): HTMLElement {
  const el = createEl(node);
  applyProps(el, node);
  const tag = (node as any).element ?? (node as any).id;
  if (tag === "form") bindFormSubmit(el as HTMLFormElement, onSubmit);
  const children = (node as any).children as RenderNode[] | undefined;
  if (children)
    for (const c of children) el.appendChild(renderToDOM(c, onSubmit));
  return el;
}

function renderInto(
  target: HTMLElement,
  node: RenderNode,
  onSubmit?: FormSubmit,
) {
  const id = (node as any).id as string;
  target.classList.add(getTemplateClassName(id));
  while (target.firstChild) target.removeChild(target.firstChild);
  applyProps(target, node);
  const tag = (node as any).element ?? id;
  if (tag === "form") bindFormSubmit(target as HTMLFormElement, onSubmit);
  const children = (node as any).children as RenderNode[] | undefined;
  if (children)
    for (const c of children) target.appendChild(renderToDOM(c, onSubmit));
}

function applyProps(el: HTMLElement, node: RenderNode) {
  const props: any = node.props ?? {};
  el.textContent = "";
  switch (node.id) {
    case "text":
      el.textContent = props.content ?? (node as any).content ?? "";
      break;
    case "input":
      if (props.queryId) el.setAttribute("name", props.queryId);
      if (props.query) el.setAttribute("placeholder", props.query);
      break;
    case "button": {
      if (props.queryId) el.setAttribute("name", props.queryId);
      const label =
        props.content ?? props.query ?? (node as any).content ?? "Submit";
      (el as HTMLButtonElement).textContent = String(label);
      (el as HTMLButtonElement).value = String(props.value ?? label);
      break;
    }
  }
}

function bindFormSubmit(formEl: HTMLFormElement, onSubmit?: FormSubmit) {
  if ((formEl as any).__guiSubmitBound) return;
  (formEl as any).__guiSubmitBound = true;

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(formEl);
    if (submitter?.name)
      fd.set(submitter.name, submitter.value || submitter.textContent || "");
    const payload = Object.fromEntries(fd) as Record<
      string,
      FormDataEntryValue
    >;
    onSubmit?.(payload);
  });
}

// TODO: must make sure number of keys on potentially partial Template model is correct.
// While the json doe not need to be complete, all the fields must be there.
// probably no way to know this off the type interface at runtime. May need to add a mapping
// somewhere. Could proably use a zod schema util for this.

export async function createRenderEngine(
  root: HTMLElement,
  onSubmit?: FormSubmit,
): Promise<RenderEngine> {
  let raw = "";
  let tmpl: LayoutNode | null = null;
  let renderModel: RenderNode | null = null;

  const { processDelta, reset: resetTelomere } = await initTelomere();

  console.log("[engine] init", { root });

  const next = (delta: string): void => {
    raw += delta;
    console.log("[engine] recv delta:", JSON.stringify(delta));
    console.log("[engine] raw now   :", JSON.stringify(raw));

    const r: any = processDelta(delta);
    console.log("[engine] telomere  :", r);

    const hasCap = r && r.type !== "NotClosable" && typeof r.cap === "string";
    console.log(
      "[engine] hasCap    :",
      hasCap,
      hasCap ? JSON.stringify(r.cap) : null,
    );
    if (!hasCap) {
      console.log("[engine] no cap → skip render this tick");
      return;
    }

    const stableDoc = raw + r.cap;
    console.log("[engine] stableDoc :", JSON.stringify(stableDoc));

    try {
      const candidate = JSON.parse(stableDoc) as unknown;
      console.log("[engine] parsed    :", candidate);
      assertLayoutNode(candidate);
      console.log("[engine] validated");
      tmpl = candidate as LayoutNode;
      renderModel = toRender(tmpl);
      console.log("[engine] toRender  :", renderModel);
    } catch (err) {
      console.error("[engine] parse/validate failed:", err);
      return;
    }

    if (!renderModel) {
      console.log("[engine] no renderModel; bail");
      return;
    }

    if (root.firstChild) {
      console.log("[engine] mutate existing snapshot");
      renderInto(root.firstElementChild as HTMLElement, renderModel, onSubmit);
    } else {
      console.log("[engine] append first snapshot");
      root.appendChild(renderToDOM(renderModel, onSubmit));
    }

    console.log(
      "[engine] post-DOM",
      { childCount: root.childElementCount },
      root.firstElementChild?.outerHTML,
    );
  };

  const reset = () => {
    console.log("[engine] reset");
    raw = "";
    tmpl = null;
    renderModel = null;
    if (root.firstChild) root.removeChild(root.firstChild);
    resetTelomere();
  };

  return { next, template: () => tmpl, render: () => renderModel, reset };
}
