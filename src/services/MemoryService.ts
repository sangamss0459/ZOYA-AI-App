import { AssistantSettings, MemoryItem } from "../types/assistant";

const SETTINGS_KEY = "zoya_ai_settings_v1";
const MEMORIES_KEY = "zoya_ai_memories_v1";

export const DEFAULT_SETTINGS: AssistantSettings = {
  userName: "",
  preferredLanguage: "auto",
  voiceName: "Zephyr",
  memoryEnabled: true,
  showLiveCaptions: false,
  backgroundServiceEnabled: false,
};

export function loadSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AssistantSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota errors
  }
}

export function loadMemories(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemories(memories: MemoryItem[]): void {
  try {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  } catch {
    // ignore storage quota errors
  }
}

export function addMemoryFact(
  category: MemoryItem["category"],
  fact: string
): MemoryItem[] {
  const existing = loadMemories();
  const normalized = fact.trim();
  if (!normalized) return existing;

  const duplicate = existing.some(
    (m) => m.fact.toLowerCase() === normalized.toLowerCase()
  );
  if (duplicate) return existing;

  const updated: MemoryItem[] = [
    {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      fact: normalized,
      createdAt: Date.now(),
    },
    ...existing,
  ].slice(0, 40);

  saveMemories(updated);
  return updated;
}

export function deleteMemoryFact(id: string): MemoryItem[] {
  const updated = loadMemories().filter((m) => m.id !== id);
  saveMemories(updated);
  return updated;
}

export function clearAllMemories(): MemoryItem[] {
  saveMemories([]);
  return [];
}
