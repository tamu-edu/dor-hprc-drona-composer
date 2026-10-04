import React, { createContext, useContext } from 'react';

/**
 * True while an element sits inside a collapsed container (at any depth).
 * useRetriever and usePolling read it to hold back retriever calls until the
 * container is opened.
 */
export const CollapsedContext = createContext(false);

export function CollapsedProvider({ collapsed, children }) {
  const parentCollapsed = useContext(CollapsedContext);
  return (
    <CollapsedContext.Provider value={parentCollapsed || !!collapsed}>
      {children}
    </CollapsedContext.Provider>
  );
}
