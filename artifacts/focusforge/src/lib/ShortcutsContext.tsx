import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface ShortcutDefinition {
    id:string;
    keys: string[];
    description: string;
    handler: (event: KeyboardEvent) => void;
    scope: 'global' | 'page';
    preventDefault?: boolean;
    allowInInput?: boolean;
}

interface ShortcutsContextType {
    register: (def: ShortcutDefinition) => () => void;
    getAll: () => ShortcutDefinition[];
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export const useShortcuts = ():  ShortcutsContextType => {
    const ctx = useContext(ShortcutsContext);
    if (!ctx) throw new Error('useShortcuts must be used within ShortcutsProvider');
    return ctx;
};

function keysToString(keys: string[]): string {
    return keys.map(k => k.toLowerCase()).sort().join('+');
}

function eventMatchesKeys(event: KeyboardEvent, keys: string[]): boolean {
    const required = new Set(keys.map(k => k.toLowerCase()));

    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;
    const hasMeta = event.metaKey;

    if (required.has('ctrl') && !hasCtrl) return false;
    if (required.has('shift') && !hasShift) return false;
    if (required.has('alt') && !hasAlt) return false;
    if (required.has('meta') && !hasMeta) return false;

    const eventKey = event.key.toLowerCase();
    const mainKeys = Array.from(required).filter(k => !['ctrl', 'shift', 'alt', 'meta'].includes(k));
    if (mainKeys.length === 0) return false;
    if (!mainKeys.includes(eventKey)) return false;

    const pressedModifiers = [];
    if (hasCtrl) pressedModifiers.push('ctrl');
    if (hasShift) pressedModifiers.push('shift');
    if (hasAlt) pressedModifiers.push('alt');
    if (hasMeta) pressedModifiers.push('meta');
    const requiredModifiers = Array.from(required).filter(k => ['ctrl', 'shift', 'alt', 'meta'].includes(k));
    if (pressedModifiers.length !== requiredModifiers.length) return false;

    return true;
}

export function  ShortcutsProvider({ children }: {children: React.ReactNode }) {
    const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
    const gloablListenerRef = useRef<((event: KeyboardEvent) => void) | null>(null);

    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const register = useCallback((def: ShortcutDefinition): (() => void) => {
        setShortcuts(prev => {
            const filtered = prev.filter(s => s.id !== def.id);
            return [...filtered, def];
        });
        return () => setShortcuts(prev => prev.filter(s => s.id !== def.id));
    }, [])
    const getAll = () => shortcuts;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable;

            for (const shortcut of shortcutsRef.current) {
                if (shortcut.scope !== 'global') continue;
                if (isInput && !shortcut.allowInInput) continue;
                if (eventMatchesKeys(event, shortcut.keys)) {
                    shortcut.handler(event);
                    break;
                }
            }
        };

        gloablListenerRef.current = handleKeyDown;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <ShortcutsContext.Provider value={{ register, getAll }}>
            {children}
        </ShortcutsContext.Provider>
    );
}