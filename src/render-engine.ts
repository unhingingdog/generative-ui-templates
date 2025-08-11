//import { Telomere } from "telomere";
//

import type { LayoutNode } from "./template-models";

const renderTemplateItem(template: LayoutNode): HTMLElement => {
  // run renderInternal
  // take Render model and build DOM element
}

export const renderEngine = (template: LayoutNode): HTMLElement => {
  // telomere; run telomere
  // if closable -> zod valdiate, recurse through and run renderTemplateItem on each 
  // if not closable -> return null caller will just not replace existing UI
  // if corrput -> throw error
};
