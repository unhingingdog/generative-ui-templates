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

// TODO: Create distinct layouts for a form submit button and a query button

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
