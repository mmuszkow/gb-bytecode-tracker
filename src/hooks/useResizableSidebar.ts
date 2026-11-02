import { useState, useEffect } from 'react';

export function useResizableSidebar(initialWidth: number = 280, minWidth: number = 180, maxWidth: number = 600) {
    const [sidebarWidth, setSidebarWidth] = useState<number>(initialWidth);
    const [isResizing, setIsResizing] = useState<boolean>(false);

    const handleMouseDown = () => setIsResizing(true);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, minWidth, maxWidth]);

    return {
        sidebarWidth,
        isResizing,
        handleMouseDown
    };
}
