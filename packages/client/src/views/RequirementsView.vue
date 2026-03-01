<template>
  <MainLayout>
    <div>
      <!-- Header -->
      <PageHeader title="任务列表" />

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-4">
        <n-input v-model:value="searchValue" placeholder="搜索任务..." clearable size="medium" class="w-56" @update:value="onSearch" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="状态" clearable size="medium" class="w-32" @update:value="reload" />
        <n-select v-model:value="filterPriority" :options="priorityOptions" placeholder="优先级" clearable size="medium" class="w-32" @update:value="reload" />
        <n-select v-model:value="filterIteration" :options="iterationOptions" placeholder="迭代" clearable size="medium" class="w-44" @update:value="reload" />
      </div>

      <!-- Batch bar -->
      <div v-if="checkedRowKeys.length > 0" class="card-solid p-3 mb-4 flex flex-wrap items-center gap-3">
        <span class="text-sm-body font-medium" style="color: var(--color-accent)">已选 {{ checkedRowKeys.length }} 项</span>
        <n-button size="tiny" @click="batchUpdateStatus('in_progress')">标记进行中</n-button>
        <n-button size="tiny" @click="batchUpdateStatus('completed')">标记完成</n-button>
        <n-button size="tiny" type="error" @click="batchDelete">删除</n-button>
        <n-button size="tiny" quaternary @click="checkedRowKeys = []">取消</n-button>
      </div>

      <!-- Task list card -->
      <n-card size="medium" class="card-no-hover">
        <template #header>
          <span class="subsection-title">需求列表</span>
        </template>
        <template #header-extra>
          <div class="flex items-center gap-2">
            <n-radio-group v-model:value="displayMode" size="small">
              <n-radio-button value="table">表格</n-radio-button>
              <n-radio-button value="card">卡片</n-radio-button>
            </n-radio-group>
            <n-popover trigger="click" placement="bottom-end" :show-arrow="false" v-if="displayMode === 'table'">
              <template #trigger>
                <n-button tertiary size="small">列设置</n-button>
              </template>
              <div class="w-56">
                <n-checkbox-group v-model:value="columnSelected">
                  <n-space vertical size="small">
                    <n-checkbox v-for="item in columnOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </n-checkbox>
                  </n-space>
                </n-checkbox-group>
              </div>
            </n-popover>
            <n-dropdown trigger="click" :options="exportOptions" @select="onExport">
              <n-button secondary size="small">
                <template #icon><n-icon><DownloadOutline /></n-icon></template>
                导出
              </n-button>
            </n-dropdown>
            <n-button type="primary" size="small" @click="openCreateForm">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新建任务
            </n-button>
          </div>
        </template>

        <!-- Table mode -->
        <n-data-table
          v-if="filteredTree.length > 0 && displayMode === 'table'"
          :columns="columns"
          :data="filteredTree"
          :row-key="(row: Task) => row.id"
          :bordered="false"
          :scroll-x="tableScrollX"
          :max-height="600"
          v-model:checked-row-keys="checkedRowKeys"
          :default-expand-all="true"
          :indent="24"
          size="small"
          :row-props="getRowProps"
          :children-key="'children'"
          striped
        />

        <!-- Card mode -->
        <div v-else-if="filteredTree.length > 0 && displayMode === 'card'" class="space-y-2">
          <div
            v-for="item in flattenedTasks"
            :key="item.task.id"
            class="flex items-stretch cursor-pointer"
            :style="{ paddingLeft: `${Math.min(item.depth, 6) * 24}px` }"
            @click="router.push(`/requirements/${item.task.id}`)"
          >
            <!-- Tree connector for children -->
            <div v-if="item.depth > 0" class="flex items-center flex-shrink-0 mr-2">
              <span style="color: var(--color-border-light); font-size: 14px">└</span>
            </div>
            <div class="card-solid p-4 stagger-item transition-all hover:shadow-md flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3 mb-3">
                <span class="block min-w-0 max-w-full font-semibold truncate" style="color: var(--color-text-primary); font-size: 14px">
                  {{ item.task.title }}
                </span>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <n-tag :type="STATUS_NAIVE_TYPE[item.task.status]" size="small" :bordered="false" round>
                    {{ STATUS_CONFIG[item.task.status].label }}
                  </n-tag>
                  <n-tag :type="PRIORITY_NAIVE_TYPE[item.task.priority]" size="small" :bordered="false" round>
                    {{ PRIORITY_CONFIG[item.task.priority].label }}
                  </n-tag>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 text-caption mb-3">
                <span>工时：{{ item.task.completed_hours }}/{{ item.task.estimated_hours }}h</span>
                <span>剩余：{{ item.task.remaining_hours }}h</span>
                <span>迭代：{{ item.task.iteration_id ? iterationStore.iterations.find(i => i.id === item.task.iteration_id)?.name || '无' : '无' }}</span>
              </div>
              <n-progress
                type="line"
                :percentage="item.task.progress"
                :height="8"
                :border-radius="4"
                :show-indicator="false"
                :processing="item.task.status === 'in_progress'"
              />
            </div>
          </div>
        </div>

        <n-empty v-else description="暂无任务" />
      </n-card>

      <!-- Create/Edit form modal -->
      <n-modal v-model:show="showForm" preset="card" :title="editingTask ? '编辑任务' : '新建任务'" :style="{ width: '560px' }" :mask-closable="false">
        <n-form ref="taskFormRef" :model="taskForm" :rules="taskFormRules" label-placement="top">
          <n-form-item label="标题" path="title">
            <n-input v-model:value="taskForm.title" placeholder="请输入任务标题" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="状态" path="status">
                <n-select v-model:value="taskForm.status" :options="statusOptions" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="优先级" path="priority">
                <n-select v-model:value="taskForm.priority" :options="priorityOptions" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-form-item label="迭代" path="iteration_id">
            <n-select v-model:value="taskForm.iteration_id" :options="iterationOptions" clearable placeholder="无" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="预估工时" path="estimated_hours">
                <n-input-number v-model:value="taskForm.estimated_hours" :min="0" :step="0.5" class="w-full" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="完成工时" path="completed_hours">
                <n-input-number v-model:value="taskForm.completed_hours" :min="0" :step="0.5" class="w-full" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="预计开始">
                <n-date-picker v-model:formatted-value="taskForm.planned_start" type="date" value-format="yyyy-MM-dd" class="w-full" clearable />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="预计结束">
                <n-date-picker v-model:formatted-value="taskForm.planned_end" type="date" value-format="yyyy-MM-dd" class="w-full" clearable />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-form>
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button @click="showForm = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="onFormSubmit">{{ editingTask ? '保存' : '创建' }}</n-button>
          </div>
        </template>
      </n-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog, NTag, NProgress, NInput, NSelect, NInputNumber, NDatePicker, NButton, type FormInst, type FormRules, type DataTableRowKey } from 'naive-ui';
import { AddOutline, DownloadOutline } from '@vicons/ionicons5';
import { useBreakpoints } from '@vueuse/core';
import { useTaskStore } from '@/stores/taskStore';
import { useIterationStore } from '@/stores/iterationStore';
import { taskApi } from '@/api';
import type { Task, TaskStatus, Priority } from '@/types';
import { STATUS_CONFIG, STATUS_NAIVE_TYPE, PRIORITY_CONFIG, PRIORITY_NAIVE_TYPE } from '@/types';
import { useTablePrefs } from '@/composables/useTablePrefs';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const taskStore = useTaskStore();
const iterationStore = useIterationStore();
const breakpoints = useBreakpoints({ sm: 640, md: 768, lg: 1024 });
const isMobile = breakpoints.smaller('sm');

const checkedRowKeys = ref<DataTableRowKey[]>([]);
const showForm = ref(false);
const submitting = ref(false);
const editingTask = ref<Task | null>(null);
const taskFormRef = ref<FormInst | null>(null);
const searchValue = ref('');
const filterStatus = ref<string | null>(null);
const filterPriority = ref<string | null>(null);
const filterIteration = ref<string | null>(null);

// Display mode (table / card)
type TaskListDisplayMode = 'table' | 'card';
const modeStorageKey = 'task-view-mode:requirements';
const displayMode = ref<TaskListDisplayMode>((localStorage.getItem(modeStorageKey) as TaskListDisplayMode) || 'table');
watch(displayMode, (mode) => {
  localStorage.setItem(modeStorageKey, mode);
});

// Inline editing state
const editingCell = ref<{ id: string; field: string } | null>(null);

const taskForm = ref({
  title: '',
  status: 'not_started' as TaskStatus,
  priority: 'medium' as Priority,
  iteration_id: null as string | null,
  estimated_hours: 0,
  completed_hours: 0,
  planned_start: null as string | null,
  planned_end: null as string | null,
});

const taskFormRules: FormRules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
};

const statusOptions = Object.entries(STATUS_CONFIG).map(([value, c]) => ({ label: c.label, value }));
const priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, c]) => ({ label: c.label, value }));
const iterationOptions = computed(() =>
  iterationStore.iterations.map(i => ({ label: i.name, value: i.id }))
);

const exportOptions = [
  { label: '导出 Excel', key: 'xlsx' },
  { label: '导出 CSV', key: 'csv' },
];

const { selected: columnSelected, options: columnOptions, isVisible } = useTablePrefs('requirements', [
  { key: 'title', label: '标题', mandatory: true },
  { key: 'status', label: '状态' },
  { key: 'priority', label: '优先级' },
  { key: 'iteration_id', label: '迭代' },
  { key: 'estimated_hours', label: '预估工时' },
  { key: 'completed_hours', label: '完成工时' },
  { key: 'remaining_hours', label: '剩余工时', defaultVisible: false },
  { key: 'overtime_hours', label: '超出工时', defaultVisible: false },
  { key: 'progress', label: '进度' },
  { key: 'planned_start', label: '预计开始', defaultVisible: false },
  { key: 'planned_end', label: '预计结束', defaultVisible: false },
]);

const tableScrollX = computed(() => (isMobile.value ? 940 : 1220));

// Flattened tasks for card mode (respects filters)
const flattenedTasks = computed(() => {
  const output: Array<{ task: Task; depth: number }> = [];
  const walk = (tasks: Task[], depth: number) => {
    for (const task of tasks) {
      output.push({ task, depth });
      if (task.children?.length) walk(task.children, depth + 1);
    }
  };
  walk(filteredTree.value, 0);
  return output;
});

// Filtered tree
const filteredTree = computed(() => {
  let tree = taskStore.taskTree;
  const s = filterStatus.value;
  const p = filterPriority.value;
  const i = filterIteration.value;
  const q = searchValue.value.toLowerCase();

  if (!s && !p && !i && !q) return tree;

  function matches(task: Task): boolean {
    if (s && task.status !== s) return false;
    if (p && task.priority !== p) return false;
    if (i && task.iteration_id !== i) return false;
    if (q && !task.title.toLowerCase().includes(q)) return false;
    return true;
  }

  function filterTree(tasks: Task[]): Task[] {
    return tasks.reduce<Task[]>((acc, task) => {
      const childMatches = task.children ? filterTree(task.children) : [];
      if (matches(task) || childMatches.length > 0) {
        acc.push({ ...task, children: childMatches.length > 0 ? childMatches : (task.children?.filter(c => matches(c)) || []) });
      }
      return acc;
    }, []);
  }

  return filterTree(tree);
});

// Columns with inline editing
const columns = computed(() => [
  { type: 'selection' as const, width: 40 },
  {
    title: '标题',
    key: 'title',
    minWidth: 320,
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'title') {
        return h(NInput, {
          defaultValue: row.title,
          size: 'small',
          autofocus: true,
          onBlur: (e: FocusEvent) => {
            const val = (e.target as HTMLInputElement).value;
            if (val && val !== row.title) saveInline(row.id, 'title', val);
            editingCell.value = null;
          },
          onKeyup: (e: KeyboardEvent) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') editingCell.value = null;
          },
        });
      }
      return h('div', {
        class: 'group flex items-center gap-1 min-w-0',
      }, [
        h('a', {
          class: 'block max-w-full whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:underline',
          style: 'color: var(--color-text-primary); font-weight: 600; font-size: 14px',
          onClick: () => router.push(`/requirements/${row.id}`),
        }, row.title),
        h(NButton, {
          size: 'tiny',
          quaternary: true,
          class: 'opacity-0 group-hover:opacity-100 transition-opacity',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            editingCell.value = { id: row.id, field: 'title' };
          },
        }, { default: () => '编辑' }),
      ]);
    },
  },
  {
    title: '状态',
    key: 'status',
    minWidth: 96,
    hidden: !isVisible('status'),
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'status') {
        return h(NSelect, {
          value: row.status,
          options: statusOptions,
          size: 'small',
          consistentMenuWidth: false,
          onUpdateValue: async (val: string) => {
            await saveInline(row.id, 'status', val);
            editingCell.value = null;
          },
        });
      }
      return h(NTag, {
        type: STATUS_NAIVE_TYPE[row.status],
        size: 'small',
        bordered: false,
        round: true,
        class: 'cursor-pointer',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'status' };
        },
      }, () => STATUS_CONFIG[row.status as TaskStatus].label);
    },
  },
  {
    title: '优先级',
    key: 'priority',
    minWidth: 90,
    hidden: !isVisible('priority'),
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'priority') {
        return h(NSelect, {
          value: row.priority,
          options: priorityOptions,
          size: 'small',
          consistentMenuWidth: false,
          onUpdateValue: async (val: string) => {
            await saveInline(row.id, 'priority', val);
            editingCell.value = null;
          },
        });
      }
      return h(NTag, {
        type: PRIORITY_NAIVE_TYPE[row.priority],
        size: 'small',
        bordered: false,
        round: true,
        class: 'cursor-pointer',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'priority' };
        },
      }, () => PRIORITY_CONFIG[row.priority as Priority].label);
    },
  },
  {
    title: '迭代',
    key: 'iteration_id',
    minWidth: 140,
    hidden: !isVisible('iteration_id'),
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'iteration_id') {
        return h(NSelect, {
          value: row.iteration_id,
          options: iterationOptions.value,
          size: 'small',
          clearable: true,
          consistentMenuWidth: false,
          placeholder: '无',
          onUpdateValue: async (val: string | null) => {
            await saveInline(row.id, 'iteration_id', val);
            editingCell.value = null;
          },
        });
      }
      const label = row.iteration_id ? iterationStore.iterations.find((i) => i.id === row.iteration_id)?.name : '无';
      return h('span', {
        class: 'cursor-pointer hover:underline',
        style: 'color: var(--color-text-secondary)',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'iteration_id' };
        },
      }, label || '无');
    },
  },
  {
    title: '预估',
    key: 'estimated_hours',
    minWidth: 88,
    hidden: !isVisible('estimated_hours'),
    render(row: Task) {
      if (row.has_children) return `${row.estimated_hours}h`;
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'estimated_hours') {
        return h(NInput, {
          defaultValue: String(row.estimated_hours),
          size: 'small',
          autofocus: true,
          onBlur: async (e: FocusEvent) => {
            const raw = (e.target as HTMLInputElement).value;
            const parsed = Number(raw);
            const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : row.estimated_hours;
            if (next !== row.estimated_hours) await saveInline(row.id, 'estimated_hours', next);
            editingCell.value = null;
          },
          onKeyup: (e: KeyboardEvent) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') editingCell.value = null;
          },
        });
      }
      return h('span', {
        class: 'cursor-pointer hover:underline',
        style: 'color: var(--color-text-secondary)',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'estimated_hours' };
        },
      }, `${row.estimated_hours}h`);
    },
  },
  {
    title: '完成',
    key: 'completed_hours',
    minWidth: 88,
    hidden: !isVisible('completed_hours'),
    render(row: Task) {
      if (row.has_children) return `${row.completed_hours}h`;
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'completed_hours') {
        return h(NInput, {
          defaultValue: String(row.completed_hours),
          size: 'small',
          autofocus: true,
          onBlur: async (e: FocusEvent) => {
            const raw = (e.target as HTMLInputElement).value;
            const parsed = Number(raw);
            const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : row.completed_hours;
            if (next !== row.completed_hours) await saveInline(row.id, 'completed_hours', next);
            editingCell.value = null;
          },
          onKeyup: (e: KeyboardEvent) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') editingCell.value = null;
          },
        });
      }
      return h('span', {
        class: 'cursor-pointer hover:underline',
        style: 'color: var(--color-text-secondary)',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'completed_hours' };
        },
      }, `${row.completed_hours}h`);
    },
  },
  {
    title: '剩余',
    key: 'remaining_hours',
    minWidth: 80,
    hidden: !isVisible('remaining_hours'),
    render(row: Task) {
      return `${row.remaining_hours}h`;
    },
  },
  {
    title: '超时',
    key: 'overtime_hours',
    minWidth: 80,
    hidden: !isVisible('overtime_hours'),
    render(row: Task) {
      return `${row.overtime_hours}h`;
    },
  },
  {
    title: '进度',
    key: 'progress',
    minWidth: 110,
    hidden: !isVisible('progress'),
    render(row: Task) {
      return h(NProgress, {
        type: 'line',
        percentage: row.progress,
        height: 16,
        borderRadius: 4,
        indicatorPlacement: 'inside',
        processing: row.status === 'in_progress',
      });
    },
  },
  {
    title: '预计开始',
    key: 'planned_start',
    minWidth: 140,
    hidden: !isVisible('planned_start'),
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'planned_start') {
        return h(NDatePicker, {
          type: 'date',
          valueFormat: 'yyyy-MM-dd',
          formattedValue: row.planned_start,
          size: 'small',
          clearable: true,
          style: 'width: 100%',
          onUpdateFormattedValue: async (val: string | null) => {
            await saveInline(row.id, 'planned_start', val);
            editingCell.value = null;
          },
        });
      }
      return h('div', {
        class: 'cursor-pointer hover:underline flex items-center',
        style: 'color: var(--color-text-secondary); min-height: 32px; width: 100%',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'planned_start' };
        },
      }, row.planned_start || '-');
    },
  },
  {
    title: '预计结束',
    key: 'planned_end',
    minWidth: 140,
    hidden: !isVisible('planned_end'),
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'planned_end') {
        return h(NDatePicker, {
          type: 'date',
          valueFormat: 'yyyy-MM-dd',
          formattedValue: row.planned_end,
          size: 'small',
          clearable: true,
          style: 'width: 100%',
          onUpdateFormattedValue: async (val: string | null) => {
            await saveInline(row.id, 'planned_end', val);
            editingCell.value = null;
          },
        });
      }
      return h('div', {
        class: 'cursor-pointer hover:underline flex items-center',
        style: 'color: var(--color-text-secondary); min-height: 32px; width: 100%',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editingCell.value = { id: row.id, field: 'planned_end' };
        },
      }, row.planned_end || '-');
    },
  },
].filter((column) => !(column as { hidden?: boolean }).hidden));

function getRowProps(row: Task) {
  return {};
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  if (isMobile.value && !localStorage.getItem('table-prefs:requirements')) {
    columnSelected.value = ['status', 'progress'];
  }
  await Promise.all([
    taskStore.fetchTaskTree(),
    iterationStore.fetchIterations(),
  ]);
});

function reload() {
  taskStore.fetchTaskTree();
}

function onSearch(value: string) {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {}, 300);
}

function openCreateForm() {
  editingTask.value = null;
  taskForm.value = {
    title: '',
    status: 'not_started',
    priority: 'medium',
    iteration_id: null,
    estimated_hours: 0,
    completed_hours: 0,
    planned_start: null,
    planned_end: null,
  };
  showForm.value = true;
}

async function onFormSubmit() {
  try { await taskFormRef.value?.validate(); } catch { return; }
  submitting.value = true;
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, taskForm.value);
    } else {
      await taskStore.createTask(taskForm.value);
    }
    message.success(editingTask.value ? '已保存' : '任务已创建');
    showForm.value = false;
  } catch (e: any) {
    message.error(e.response?.data?.error || '操作失败');
  } finally {
    submitting.value = false;
  }
}

async function saveInline(id: string, field: string, value: unknown) {
  try {
    if (field === 'status') {
      await taskStore.changeStatus(id, value as string);
    } else {
      await taskStore.updateTask(id, { [field]: value } as Partial<Task>);
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || '更新失败');
  }
}

function onExport(key: string) {
  const url = taskApi.exportUrl(key, {
    status: filterStatus.value as any,
    priority: filterPriority.value as any,
    iteration_id: filterIteration.value || undefined,
    search: searchValue.value || undefined,
  });
  window.open(url, '_blank');
}

async function batchUpdateStatus(status: string) {
  const ids = checkedRowKeys.value.map(k => String(k));
  await taskApi.batch('update_status', ids, { status });
  checkedRowKeys.value = [];
  await taskStore.fetchTaskTree();
  message.success('批量更新成功');
}

function batchDelete() {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除选中的 ${checkedRowKeys.value.length} 个任务吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const ids = checkedRowKeys.value.map(k => String(k));
      await taskApi.batch('delete', ids);
      checkedRowKeys.value = [];
      await taskStore.fetchTaskTree();
      message.success('已删除');
    },
  });
}
</script>
