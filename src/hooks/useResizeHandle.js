import { useState, useEffect, useCallback } from 'react';

export const useResizeHandle = (initialWidth = 55) => {
  const [leftWidth, setLeftWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e, modalRef) => {
    if (!isResizing || !modalRef.current) return;
    const modalRect = modalRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - modalRect.left) / modalRect.width) * 100;
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      const moveHandler = (e) => handleMouseMove(e, { current: document.querySelector('[data-modal-ref]') });
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    leftWidth,
    isResizing,
    handleMouseDown
  };
};
