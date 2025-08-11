import type { LayoutNode } from "./template-models";
import {
  webTagMap,
  type RenderButton,
  type RenderInput,
  type RenderNode,
} from "./web-render-models";

export const transformLayoutTemplateToWebTemplate = (
  node: LayoutNode,
): RenderNode => {
  switch (node.id) {
    case "container":
      return {
        id: "container",
        element: webTagMap.container,
        children: node.children.map(transformLayoutTemplateToWebTemplate),
      };
    case "text":
      return {
        id: "text",
        element: webTagMap.text,
        props: { content: node.content },
      };
    case "input":
      return {
        id: "input",
        element: webTagMap.input,
        props: { queryId: node.queryId, query: node.query },
      };
    case "button":
      return {
        id: "button",
        element: webTagMap.button,
        props: { queryId: node.queryId, query: node.query },
      };
    case "form":
      return {
        id: "form",
        element: webTagMap.form,
        children: node.children.map(
          transformLayoutTemplateToWebTemplate,
        ) as Array<RenderInput | RenderButton>,
      };
  }
};
