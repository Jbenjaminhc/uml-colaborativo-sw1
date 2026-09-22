import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';

export interface Command {
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

interface HistoryContextType {
  undo: () => void;
  redo: () => void;
  pushCommand: (command: Command) => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const undoStackRef = useRef<Command[]>([]);
  const redoStackRef = useRef<Command[]>([]);
  const queuePromise = useRef<Promise<void>>(Promise.resolve());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushCommand = useCallback((command: Command) => {
    undoStackRef.current.push(command);
    redoStackRef.current = [];
    updateState();
  }, [updateState]);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const command = undoStackRef.current.pop()!;
    redoStackRef.current.push(command);
    updateState();
    
    // Ensure network operations are strictly sequential
    queuePromise.current = queuePromise.current.then(async () => {
      try {
        await command.undo();
      } catch (e) {
        console.error("Undo failed:", e);
      }
    });
  }, [updateState]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const command = redoStackRef.current.pop()!;
    undoStackRef.current.push(command);
    updateState();
    
    // Ensure network operations are strictly sequential
    queuePromise.current = queuePromise.current.then(async () => {
      try {
        await command.redo();
      } catch (e) {
        console.error("Redo failed:", e);
      }
    });
  }, [updateState]);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateState();
  }, [updateState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <HistoryContext.Provider 
      value={{ 
        undo, 
        redo, 
        pushCommand, 
        canUndo, 
        canRedo, 
        clearHistory 
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
