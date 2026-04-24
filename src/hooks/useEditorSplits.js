import { useState, useCallback, useEffect, useRef } from 'react';

let _id = 0;
const nextId = () => ++_id;

export const useEditorSplits = () => {
  const [splits, setSplits] = useState(() => [{ id: nextId(), activePaneIndex: 0 }]);
  const [widths, setWidths] = useState([100]);
  const [resizingHandle, setResizingHandle] = useState(null);
  const containerRef = useRef(null);
  const resizeStateRef = useRef(null);

  const addSplit = useCallback((afterIndex, paneIndex = 0) => {
    setSplits(prev => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, { id: nextId(), activePaneIndex: paneIndex });
      return next;
    });
    setWidths(prev => {
      const count = prev.length + 1;
      return Array(count).fill(100 / count);
    });
  }, []);

  const removeSplit = useCallback((splitId) => {
    setSplits(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(s => s.id !== splitId);
    });
    setWidths(prev => {
      if (prev.length <= 1) return prev;
      const count = prev.length - 1;
      return Array(count).fill(100 / count);
    });
  }, []);

  const setActivePaneForSplit = useCallback((splitId, paneIndex) => {
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, activePaneIndex: paneIndex } : s));
  }, []);

  const handleResizeStart = useCallback((handleIndex, e) => {
    e.preventDefault();
    resizeStateRef.current = { handleIndex, startX: e.clientX, startWidths: [...widths] };
    setResizingHandle(handleIndex);
  }, [widths]);

  useEffect(() => {
    if (resizingHandle === null) return;

    const { startX, startWidths, handleIndex } = resizeStateRef.current;

    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const containerW = container.getBoundingClientRect().width;
      const dx = e.clientX - startX;
      const dPct = (dx / containerW) * 100;
      const newL = startWidths[handleIndex] + dPct;
      const newR = startWidths[handleIndex + 1] - dPct;
      if (newL >= 15 && newR >= 15) {
        setWidths(prev => {
          const next = [...prev];
          next[handleIndex] = newL;
          next[handleIndex + 1] = newR;
          return next;
        });
      }
    };

    const handleMouseUp = () => setResizingHandle(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingHandle]);

  return { splits, widths, resizingHandle, containerRef, addSplit, removeSplit, setActivePaneForSplit, handleResizeStart };
};
