import type { NodeId, QueryPrompt } from "./template-models";

type Tag = keyof HTMLElementTagNameMap;

/** Keep one tag‑map per render target so unused ones tree‑shake out. */
export const webTagMap = {
  container: "div",
  text: "p",
  input: "input",
  button: "button",
  form: "form",
} as const satisfies Record<NodeId, Tag>;

type TagFor<I extends NodeId> = (typeof webTagMap)[I];

export interface RenderBase<I extends NodeId, P = Record<string, unknown>> {
  id: I;
  element: TagFor<I>;
  optimistic?: boolean;
  props?: P;
}

export interface ParentRenderNode<C extends RenderNode = RenderNode> {
  children: C[];
}

/* specialised render nodes ---------------------------------------- */
export interface RenderContainer
  extends RenderBase<"container">,
    ParentRenderNode {
  element: "div";
}

export interface RenderText extends RenderBase<"text", { content: string }> {
  element: "p";
}

export interface RenderInput extends RenderBase<"input", QueryPrompt> {
  element: "input";
}

export interface RenderButton extends RenderBase<"button", QueryPrompt> {
  element: "button";
}

export interface RenderForm
  extends RenderBase<"form">,
    ParentRenderNode<RenderInput | RenderButton> {
  element: "form";
}

export type RenderNode =
  | RenderContainer
  | RenderText
  | RenderInput
  | RenderButton
  | RenderForm;
