import { renderInternal } from "./template-model-transform";
import type {
  RenderButton,
  RenderContainer,
  RenderForm,
  RenderInput,
  RenderNode,
  RenderText,
} from "./web-render-models";

export type NodeId = "container" | "text" | "input" | "button" | "form";

/* reusable traits -------------------------------------------------- */
export interface LayoutBase<I extends NodeId> {
  id: I;
}
export interface Parent<T extends LayoutNode = LayoutNode> {
  children: T[];
}
export interface TextContent {
  content: string;
}
export interface QueryPrompt {
  queryId: string;
  query: string;
}
export interface QueryableParent<
  T extends LayoutInput | LayoutButton = LayoutInput | LayoutButton,
> {
  children: T[];
}

/* concrete layout nodes ------------------------------------------- */
export type LayoutContainer = LayoutBase<"container"> & Parent;
export type LayoutText = LayoutBase<"text"> & TextContent;
export type LayoutInput = LayoutBase<"input"> & QueryPrompt;
export type LayoutButton = LayoutBase<"button"> & QueryPrompt;
export type LayoutForm = LayoutBase<"form"> & QueryableParent;

export type LayoutNode =
  | LayoutContainer
  | LayoutText
  | LayoutInput
  | LayoutButton
  | LayoutForm;

/* Public overloads (nice narrow return types) */
export function toRender(node: LayoutContainer): RenderContainer;
export function toRender(node: LayoutText): RenderText;
export function toRender(node: LayoutInput): RenderInput;
export function toRender(node: LayoutButton): RenderButton;
export function toRender(node: LayoutForm): RenderForm;
export function toRender(node: LayoutNode): RenderNode {
  return renderInternal(node);
}
