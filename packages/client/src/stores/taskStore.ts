import { taskApi } from '@/api';
import type { ColumnConfig, Task, TaskFilter } from '@/types';
import { DEFAULT_COLUMNS } from '@/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([]);
  const taskTree = ref<Task[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const currentTask = ref<Task | null>(null);

  const filter = ref<TaskFilter>({
    status: '',
    priority: '',
    iteration_id: '',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    page_size: 50,
  });

  const selectedIds = ref<Set<string>>(new Set());
  const columns = ref<ColumnConfig[]>(loadColumns());

  const visibleColumns = computed(() => columns.value.filter(c => c.visible));
  const hasSelection = computed(() => selectedIds.value.size > 0);

  function loadColumns(): ColumnConfig[] {
    const saved = localStorage.getItem('task-columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return [...DEFAULT_COLUMNS];
  }

  function saveColumns() {
    localStorage.setItem('task-columns', JSON.stringify(columns.value));
  }

  function toggleColumn(key: string) {
    const col = columns.value.find(c => c.key === key);
    if (col && key !== 'title') {
      col.visible = !col.visible;
      saveColumns();
    }
  }

  async function fetchTasks() {
    loading.value = true;
    try {
      const { data } = await taskApi.list(filter.value);
      tasks.value = data.data;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTaskTree() {
    loading.value = true;
    try {
      const { data } = await taskApi.tree();
      taskTree.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTaskById(id: string) {
    const { data } = await taskApi.getById(id);
    currentTask.value = data;
    return data;
  }

  async function createTask(taskData: Partial<Task>) {
    const { data } = await taskApi.create(taskData);
    await fetchTaskTree();
    return data;
  }

  async function updateTask(id: string, taskData: Partial<Task>) {
    const { data } = await taskApi.update(id, taskData);
    await fetchTaskTree();
    if (currentTask.value?.id === id) {
      currentTask.value = data;
    }
    return data;
  }

  async function changeStatus(id: string, status: string) {
    const { data } = await taskApi.changeStatus(id, status);
    await fetchTaskTree();
    if (currentTask.value?.id === id) {
      currentTask.value = data;
    }
    return data;
  }

  async function deleteTask(id: string) {
    await taskApi.delete(id);
    selectedIds.value.delete(id);
    await fetchTaskTree();
  }

  async function batchOperation(action: string, params?: Record<string, unknown>) {
    const ids = Array.from(selectedIds.value);
    if (ids.length === 0) return;
    await taskApi.batch(action, ids, params);
    selectedIds.value.clear();
    await fetchTaskTree();
  }

  function toggleSelection(id: string) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  }

  function clearSelection() {
    selectedIds.value.clear();
  }

  function selectAll(ids: string[]) {
    ids.forEach(id => selectedIds.value.add(id));
  }

  return {
    tasks, taskTree, total, loading, currentTask,
    filter, selectedIds, columns, visibleColumns, hasSelection,
    fetchTasks, fetchTaskTree, fetchTaskById,
    createTask, updateTask, changeStatus, deleteTask,
    batchOperation, toggleSelection, clearSelection, selectAll,
    toggleColumn, saveColumns,
  };
});
