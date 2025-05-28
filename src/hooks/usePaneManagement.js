import { useState, useEffect, useMemo } from 'react';

export const usePaneManagement = (panes) => {
  const [activePane, setActivePane] = useState(0);

  const sortedPanes = useMemo(() => {
    if (!panes || !Array.isArray(panes)) return [];
    let zeroOrderIndex = 10000;
    return [...panes]
      .map((pane, index) => {
        if (pane.order === 0) {
          return { ...pane, order: zeroOrderIndex + index };
        }
        return pane;
      })
      .sort((a, b) => a.order - b.order)
      .filter(pane => pane.order !== -1);
  }, [panes]);

  useEffect(() => {
    if (activePane >= sortedPanes.length && sortedPanes.length > 0) {
      setActivePane(0);
    }
  }, [activePane, sortedPanes.length]);

  return {
    sortedPanes,
    activePane,
    setActivePane
  };
};
