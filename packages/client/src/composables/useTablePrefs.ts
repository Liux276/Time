import { computed, ref, watch } from 'vue';

export interface TableColumnPreset {
  key: string;
  label: string;
  mandatory?: boolean;
  defaultVisible?: boolean;
}

function getStorageKey(pageKey: string): string {
  return `table-prefs:${pageKey}`;
}

function getDefaultVisibleKeys(columns: TableColumnPreset[]): string[] {
  return columns
    .filter((column) => column.mandatory || column.defaultVisible !== false)
    .map((column) => column.key);
}

export function useTablePrefs(pageKey: string, columns: TableColumnPreset[]) {
  const storageKey = getStorageKey(pageKey);
  const fallbackKeys = getDefaultVisibleKeys(columns);
  const mandatoryKeys = columns.filter((column) => column.mandatory).map((column) => column.key);
  const optionalKeys = new Set(columns.filter((column) => !column.mandatory).map((column) => column.key));

  const visibleKeys = ref<string[]>(fallbackKeys);

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      const allowedKeys = new Set(columns.map((column) => column.key));
      const sanitized = parsed.filter((key) => allowedKeys.has(key));
      const merged = Array.from(new Set([...mandatoryKeys, ...sanitized]));
      visibleKeys.value = merged.length > 0 ? merged : fallbackKeys;
    }
  } catch {
    visibleKeys.value = fallbackKeys;
  }

  watch(visibleKeys, (keys) => {
    const persisted = keys.filter((key) => optionalKeys.has(key));
    localStorage.setItem(storageKey, JSON.stringify(persisted));
  }, { deep: true });

  const options = computed(() =>
    columns
      .filter((column) => !column.mandatory)
      .map((column) => ({ label: column.label, value: column.key }))
  );

  const selected = computed<string[]>({
    get: () => visibleKeys.value.filter((key) => optionalKeys.has(key)),
    set: (keys) => {
      const sanitized = keys.filter((key) => optionalKeys.has(key));
      visibleKeys.value = Array.from(new Set([...mandatoryKeys, ...sanitized]));
    },
  });

  function isVisible(key: string): boolean {
    return visibleKeys.value.includes(key);
  }

  return {
    visibleKeys,
    selected,
    options,
    isVisible,
  };
}
