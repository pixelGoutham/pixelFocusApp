import { useEffect } from "react";
import { useShortcuts } from "@/lib/ShortcutsContext";
import type { ShortcutDefinition } from "@/lib/ShortcutsContext";

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

export function useKeyboardShortcut(
    keys: string[],
    handler: (event: KeyboardEvent) => void,
    options: {
        description?: string;
        preventDefault?: boolean;
        allowInInput?: boolean;
        id?: string;
    } = {}
) {
    const normalizedKeys = keys.map(k => k.toLowerCase());
    const id = options.id ?? normalizedKeys.sort().join('+');

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable;
            if (isInput && !options.allowInInput) return;
            if (eventMatchesKeys(event, normalizedKeys)) {
                if (options.preventDefault !== false) event.preventDefault();
                handler(event);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [normalizedKeys, handler, options.allowInInput, options.preventDefault]);
}

export function useGlobalKeyboardShortcut(
    keys: string[],
    handler: (event: KeyboardEvent) => void,
    options: {
        description?: string;
        preventDefault?: boolean;
        allowInInput?: boolean;
        id?: string;
    } = {}
) {
    const { register } = useShortcuts();
    const id = options.id ?? `global-${keys.map(k => k.toLowerCase()).sort().join('+')}`;
    const description = options.description ?? keys.join(' + ');

    useEffect(() => {
        const def: ShortcutDefinition = {
            id,
            keys: keys.map(k => k.toLowerCase()),
            description,
            handler,
            scope: 'global',
            preventDefault: options.preventDefault ?? true,
            allowInInput: options.allowInInput ?? false,
        };
        const unregister = register(def);
        return unregister;
    }, [keys, handler, options.preventDefault, options.allowInInput, id, register]);
}