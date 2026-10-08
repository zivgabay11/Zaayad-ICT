import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DocFile {
    id: string;
    name: string;
    data: Uint8Array;
    numPages: number;
}

interface DocContextType {
    isDocOpen: boolean;
    docWidth: number;
    files: DocFile[];
    activeFileId: string | null;
    zoomLevel: number;
    panOffset: { x: number; y: number };
    isMagnifying: boolean;
    openDoc: (width?: number) => void;
    closeDoc: () => void;
    setDocWidth: (width: number) => void;
    addFile: (file: Omit<DocFile, 'id'>) => void;
    removeFile: (id: string) => void;
    setActiveFile: (id: string) => void;
    setZoomLevel: (level: number) => void;
    setPanOffset: (offset: { x: number; y: number }) => void;
    resetZoom: () => void;
    setIsMagnifying: (value: boolean) => void;
}

const DocContext = createContext<DocContextType | undefined>(undefined);

const ZOOM_MIN = 1.0;
const ZOOM_MAX = 5.0;

function clampZoom(value: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

interface DocProviderProps {
    children: ReactNode;
}

export const DocProvider: React.FC<DocProviderProps> = ({ children }) => {
    const [isDocOpen, setIsDocOpen] = useState(false);
    const [docWidth, setDocWidth] = useState(40);
    const [files, setFiles] = useState<DocFile[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [zoomLevel, setZoomLevelRaw] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isMagnifying, setIsMagnifying] = useState(false);

    const openDoc = useCallback((width?: number) => {
        setIsDocOpen(true);
        if (width !== undefined) setDocWidth(width);
    }, []);

    const closeDoc = useCallback(() => {
        setIsDocOpen(false);
    }, []);

    const addFile = useCallback((file: Omit<DocFile, 'id'>) => {
        const id = crypto.randomUUID();
        const newFile: DocFile = { ...file, id };
        setFiles(prev => [...prev, newFile]);
        setActiveFileId(id);
        setIsDocOpen(true);
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => {
            const next = prev.filter(f => f.id !== id);
            if (activeFileId === id) {
                setActiveFileId(next.length > 0 ? next[0].id : null);
            }
            if (next.length === 0) {
                setIsDocOpen(false);
            }
            return next;
        });
    }, [activeFileId]);

    const setActiveFile = useCallback((id: string) => {
        setActiveFileId(id);
    }, []);

    const setZoomLevel = useCallback((level: number) => {
        setZoomLevelRaw(clampZoom(level));
    }, []);

    const resetZoom = useCallback(() => {
        setZoomLevelRaw(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    return (
        <DocContext.Provider value={{
            isDocOpen,
            docWidth,
            files,
            activeFileId,
            zoomLevel,
            panOffset,
            isMagnifying,
            openDoc,
            closeDoc,
            setDocWidth,
            addFile,
            removeFile,
            setActiveFile,
            setZoomLevel,
            setPanOffset,
            resetZoom,
            setIsMagnifying,
        }}>
            {children}
        </DocContext.Provider>
    );
};

export const useDocContext = () => {
    const context = useContext(DocContext);
    if (context === undefined) throw new Error('useDocContext must be used within a DocProvider');
    return context;
};
