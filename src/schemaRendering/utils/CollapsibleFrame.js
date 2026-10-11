/**
 * LayoutFrame plus the collapse state for elements that fetch data. With a collapsible card
 * (`layout.collapsible` / `layout.collapsed`) the title pill toggles the content, and CollapsedProvider holds
 * back retriever calls and polling in `children` while it is folded. Put the element's hooks in a component
 * rendered as `children`, so they sit under the provider.
 */
import React, { useState } from "react";
import { CollapsedProvider } from "../CollapsedContext";
import LayoutFrame from "./LayoutFrame";

function CollapsibleFrame({ resolved, actionRef, children }) {
  const [isCollapsed, setIsCollapsed] = useState(resolved.collapsed);
  const collapse = resolved.collapsible && resolved.frame
    ? {
        isCollapsed,
        onToggle: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsCollapsed((prev) => !prev);
        },
      }
    : undefined;

  return (
    <LayoutFrame resolved={resolved} collapse={collapse} actionRef={actionRef}>
      <CollapsedProvider collapsed={!!collapse && isCollapsed}>{children}</CollapsedProvider>
    </LayoutFrame>
  );
}

export default CollapsibleFrame;
