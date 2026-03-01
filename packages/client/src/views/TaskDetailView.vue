<template>
  <MainLayout>
    <div>
      <!-- Header -->
      <PageHeader :title="task?.title || '任务详情'" showBack />

      <div v-if="task" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Editable title -->
          <n-card size="small" class="card-no-hover">
            <n-form-item label="标题" :show-feedback="false" label-placement="top" size="small">
              <n-input v-model:value="editForm.title" @blur="saveField('title', editForm.title)" />
            </n-form-item>
          </n-card>

          <!-- Sub tasks -->
          <n-card size="small" class="card-no-hover">
            <template #header>
              <span class="subsection-title">子任务</span>
            </template>
            <template #header-extra>
              <div class="flex items-center gap-2">
                <n-popover trigger="click" placement="bottom-end" :show-arrow="false">
                  <template #trigger>
                    <n-button tertiary size="tiny">列设置</n-button>
                  </template>
                  <div class="w-52">
                    <n-checkbox-group v-model:value="childColumnSelected">
                      <n-space vertical size="small">
                        <n-checkbox v-for="item in childColumnOptions" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                  </div>
                </n-popover>
                <n-button type="primary" size="tiny" @click="showChildForm = true">添加子任务</n-button>
              </div>
            </template>
            <n-data-table
              v-if="task.children && task.children.length > 0"
              :columns="childColumns"
              :data="task.children"
              :row-key="(row: Task) => row.id"
              :bordered="false"
              :scroll-x="childTableScrollX"
              size="small"
            />
            <n-empty v-else description="暂无子任务" />
          </n-card>

          <!-- Status logs -->
          <n-card size="small" class="card-no-hover">
            <template #header>
              <span class="subsection-title">状态变更记录</span>
            </template>
            <n-timeline v-if="task.status_logs && task.status_logs.length > 0">
              <n-timeline-item
                v-for="log in task.status_logs"
                :key="log.id"
                :time="formatDate(log.changed_at)"
                :content="log.from_status ? `${statusLabel(log.from_status)} → ${statusLabel(log.to_status)}` : statusLabel(log.to_status)"
                type="info"
              />
            </n-timeline>
            <n-empty v-else description="暂无状态变更记录" />
          </n-card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-4">
          <n-card size="small" class="card-no-hover">
            <n-space vertical>
              <!-- Status -->
              <div>
                <span class="text-caption block mb-2" style="color: var(--color-text-muted)">状态</span>
                <div class="flex flex-wrap gap-2">
                  <n-button v-for="s in allStatuses" :key="s.value" size="tiny"
                    :type="task.status === s.value ? 'primary' : 'default'"
                    :ghost="task.status !== s.value"
                    :disabled="task.status === s.value"
                    @click="changeStatus(s.value)">
                    {{ s.label }}
                  </n-button>
                </div>
              </div>

              <!-- Priority -->
              <n-form-item label="优先级" :show-feedback="false" label-placement="top" size="small">
                <n-select v-model:value="editForm.priority" :options="priorityOptions" @update:value="(v: string) => saveField('priority', v)" />
              </n-form-item>

              <!-- Iteration -->
              <n-form-item label="迭代" :show-feedback="false" label-placement="top" size="small">
                <n-select v-model:value="editForm.iteration_id" :options="iterationOptions" clearable placeholder="无" @update:value="(v: string | null) => saveField('iteration_id', v)" />
              </n-form-item>

              <!-- Hours -->
              <n-grid :cols="2" :x-gap="8">
                <n-gi>
                  <n-form-item label="预估工时" :show-feedback="false" label-placement="top" size="small">
                    <n-input-number v-model:value="editForm.estimated_hours" :min="0" :step="0.5" :disabled="task.has_children" class="w-full" @update:value="(v: number | null) => saveField('estimated_hours', v ?? 0)" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="完成工时" :show-feedback="false" label-placement="top" size="small">
                    <n-input-number v-model:value="editForm.completed_hours" :min="0" :step="0.5" :disabled="task.has_children" class="w-full" @update:value="(v: number | null) => saveField('completed_hours', v ?? 0)" />
                  </n-form-item>
                </n-gi>
              </n-grid>

              <!-- Dates -->
              <n-grid :cols="2" :x-gap="8">
                <n-gi>
                  <n-form-item label="预计开始" :show-feedback="false" label-placement="top" size="small">
                    <n-date-picker v-model:formatted-value="editForm.planned_start" type="date" value-format="yyyy-MM-dd" class="w-full" clearable @update:formatted-value="(v: string | null) => saveField('planned_start', v)" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="预计结束" :show-feedback="false" label-placement="top" size="small">
                    <n-date-picker v-model:formatted-value="editForm.planned_end" type="date" value-format="yyyy-MM-dd" class="w-full" clearable @update:formatted-value="(v: string | null) => saveField('planned_end', v)" />
                  </n-form-item>
                </n-gi>
              </n-grid>

              <!-- Parent Task -->
              <n-form-item label="父任务" :show-feedback="false" label-placement="top" size="small">
                <n-select v-model:value="editForm.parent_id" :options="parentTaskOptions" clearable placeholder="无" @update:value="(v: string | null) => saveField('parent_id', v)" />
              </n-form-item>

              <!-- Progress -->
              <div>
                <span class="text-caption block mb-2" style="color: var(--color-text-muted)">进度</span>
                <n-progress type="line" :percentage="task.progress" :height="20" :border-radius="4" indicator-placement="inside" :processing="task.status === 'in_progress'" />
              </div>

              <div class="h-px w-full my-2" style="background: var(--color-border)" />

              <!-- Metadata -->
              <div class="grid grid-cols-1 gap-2">
                <div class="flex justify-between text-caption">
                  <span style="color: var(--color-text-muted)">剩余工时</span>
                  <span style="color: var(--color-text-secondary)">{{ task.remaining_hours }}h</span>
                </div>
                <div class="flex justify-between text-caption">
                  <span style="color: var(--color-text-muted)">超出工时</span>
                  <span style="color: var(--color-text-secondary)">{{ task.overtime_hours }}h</span>
                </div>
                <div class="flex justify-between text-caption">
                  <span style="color: var(--color-text-muted)">创建时间</span>
                  <span style="color: var(--color-text-secondary)">{{ formatDate(task.created_at) }}</span>
                </div>
                <div v-if="task.completed_at" class="flex justify-between text-caption">
                  <span style="color: var(--color-text-muted)">完成时间</span>
                  <span style="color: var(--color-text-secondary)">{{ formatDate(task.completed_at) }}</span>
                </div>
              </div>
            </n-space>
          </n-card>

          <n-button type="error" block secondary @click="confirmDeleteTask(null)">删除任务</n-button>
        </div>
      </div>

      <div v-else-if="!loading" class="card-glass p-12 text-center card-no-hover">
        <n-empty description="任务不存在" />
      </div>

      <n-spin v-if="loading" class="flex justify-center py-12" />
    </div>

    <!-- Add child task form -->
    <n-modal v-model:show="showChildForm" preset="card" title="添加子任务" :style="{ width: '500px' }" :mask-closable="false">
      <n-form ref="childFormRef" :model="childForm" :rules="{ title: [{ required: true, message: '请输入标题' }] }" label-placement="top">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="childForm.title" placeholder="请输入子任务标题" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="优先级">
              <n-select v-model:value="childForm.priority" :options="priorityOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="预估工时">
              <n-input-number v-model:value="childForm.estimated_hours" :min="0" :step="0.5" class="w-full" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-form>
      <template #action>
        <div class="flex justify-end gap-2">
          <n-button @click="showChildForm = false">取消</n-button>
          <n-button type="primary" @click="addChild">创建</n-button>
        </div>
      </template>
    </n-modal>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog, NTag, NButton, NProgress, NInput, NSelect, type FormInst } from 'naive-ui';
import { useBreakpoints } from '@vueuse/core';
import { useTaskStore } from '@/stores/taskStore';
import { useIterationStore } from '@/stores/iterationStore';
import { taskApi } from '@/api';
import type { Task, Priority } from '@/types';
import { STATUS_CONFIG, STATUS_NAIVE_TYPE, PRIORITY_CONFIG, PRIORITY_NAIVE_TYPE, type TaskStatus } from '@/types';
import { useTablePrefs } from '@/composables/useTablePrefs';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialogApi = useDialog();
const taskStore = useTaskStore();
const iterationStore = useIterationStore();
const breakpoints = useBreakpoints({ sm: 640, md: 768, lg: 1024 });
const isMobile = breakpoints.smaller('sm');

const task = ref<Task | null>(null);
const loading = ref(true);
const showChildForm = ref(false);
const childFormRef = ref<FormInst | null>(null);
const childEditingCell = ref<{ id: string; field: string } | null>(null);

const editForm = reactive({
  title: '',
  priority: 'medium' as Priority,
  iteration_id: null as string | null,
  parent_id: null as string | null,
  estimated_hours: 0,
  completed_hours: 0,
  planned_start: null as string | null,
  planned_end: null as string | null,
});

const childForm = reactive({
  title: '',
  priority: 'medium' as Priority,
  estimated_hours: 0,
});

const allStatuses = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value: value as TaskStatus, ...config,
}));

const priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, c]) => ({ label: c.label, value }));
const iterationOptions = computed(() =>
  iterationStore.iterations.map(i => ({ label: i.name, value: i.id }))
);

const { selected: childColumnSelected, options: childColumnOptions, isVisible: isChildColumnVisible } = useTablePrefs('task-detail-children', [
  { key: 'title', label: '标题', mandatory: true },
  { key: 'status', label: '状态' },
  { key: 'priority', label: '优先级' },
  { key: 'hours', label: '工时' },
  { key: 'actions', label: '操作' },
]);

const childTableScrollX = computed(() => (isMobile.value ? 620 : 760));

// Parent task options: flatten the tree, excluding self and descendants
const parentTaskOptions = computed(() => {
  const currentId = task.value?.id;
  if (!currentId) return [];
  const excludeIds = new Set<string>();
  // Collect self + all descendants
  function collectDescendants(tasks: Task[]) {
    for (const t of tasks) {
      if (t.id === currentId) {
        excludeIds.add(t.id);
        if (t.children) collectAll(t.children);
      } else {
        if (t.children) collectDescendants(t.children);
      }
    }
  }
  function collectAll(tasks: Task[]) {
    for (const t of tasks) {
      excludeIds.add(t.id);
      if (t.children) collectAll(t.children);
    }
  }
  collectDescendants(taskStore.taskTree);
  // Flatten remaining
  const result: Array<{ label: string; value: string }> = [];
  function flatten(tasks: Task[], prefix: string) {
    for (const t of tasks) {
      if (!excludeIds.has(t.id)) {
        result.push({ label: prefix + t.title, value: t.id });
        if (t.children) flatten(t.children, prefix + '  ');
      }
    }
  }
  flatten(taskStore.taskTree, '');
  return result;
});

const childColumns = computed(() => [
  {
    title: '标题', key: 'title', minWidth: 220, ellipsis: { tooltip: true },
    render(row: Task) {
      if (childEditingCell.value?.id === row.id && childEditingCell.value?.field === 'title') {
        return h(NInput, {
          defaultValue: row.title,
          size: 'small',
          autofocus: true,
          onBlur: async (e: FocusEvent) => {
            const val = (e.target as HTMLInputElement).value.trim();
            if (val && val !== row.title) {
              await saveChildField(row.id, 'title', val);
            }
            childEditingCell.value = null;
          },
          onKeyup: (e: KeyboardEvent) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') childEditingCell.value = null;
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
            childEditingCell.value = { id: row.id, field: 'title' };
          },
        }, { default: () => '编辑' }),
      ]);
    },
  },
  {
    title: '状态', key: 'status', minWidth: 88,
    hidden: !isChildColumnVisible('status'),
    render(row: Task) {
      if (childEditingCell.value?.id === row.id && childEditingCell.value?.field === 'status') {
        return h(NSelect, {
          value: row.status,
          options: Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label })),
          size: 'small',
          consistentMenuWidth: false,
          onUpdateValue: async (value: string) => {
            await saveChildField(row.id, 'status', value);
            childEditingCell.value = null;
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
          childEditingCell.value = { id: row.id, field: 'status' };
        },
      }, () => STATUS_CONFIG[row.status]?.label);
    },
  },
  {
    title: '优先级', key: 'priority', minWidth: 82,
    hidden: !isChildColumnVisible('priority'),
    render(row: Task) {
      if (childEditingCell.value?.id === row.id && childEditingCell.value?.field === 'priority') {
        return h(NSelect, {
          value: row.priority,
          options: priorityOptions,
          size: 'small',
          consistentMenuWidth: false,
          onUpdateValue: async (value: string) => {
            await saveChildField(row.id, 'priority', value);
            childEditingCell.value = null;
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
          childEditingCell.value = { id: row.id, field: 'priority' };
        },
      }, () => PRIORITY_CONFIG[row.priority]?.label);
    },
  },
  {
    title: '工时', key: 'hours', minWidth: 96,
    hidden: !isChildColumnVisible('hours'),
    render(row: Task) { return `${row.completed_hours}/${row.estimated_hours}h`; },
  },
  {
    title: '', key: 'actions', minWidth: 60,
    hidden: !isChildColumnVisible('actions'),
    render(row: Task) {
      return h(NButton, {
        size: 'tiny', type: 'error', quaternary: true,
        onClick: (e: Event) => { e.stopPropagation(); confirmDeleteTask(row); },
      }, () => '删除');
    },
  },
].filter((column) => !(column as { hidden?: boolean }).hidden));

async function loadTask() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const data = await taskStore.fetchTaskById(id);
    task.value = data;
    editForm.title = data.title;
    editForm.priority = data.priority;
    editForm.iteration_id = data.iteration_id || null;
    editForm.estimated_hours = data.estimated_hours;
    editForm.completed_hours = data.completed_hours;
    editForm.planned_start = data.planned_start || null;
    editForm.planned_end = data.planned_end || null;
    editForm.parent_id = data.parent_id || null;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (isMobile.value && !localStorage.getItem('table-prefs:task-detail-children')) {
    childColumnSelected.value = ['status', 'hours', 'actions'];
  }
  await Promise.all([iterationStore.fetchIterations(), taskStore.fetchTaskTree()]);
  await loadTask();
});

watch(() => route.params.id, () => {
  if (route.params.id) loadTask();
});

async function changeStatus(status: string) {
  if (!task.value || task.value.status === status) return;
  try {
    await taskStore.changeStatus(task.value.id, status);
    await loadTask();
  } catch (e: any) {
    message.error(e.response?.data?.error || '状态更新失败');
  }
}

async function saveField(field: string, value: unknown) {
  if (!task.value) return;
  try {
    await taskStore.updateTask(task.value.id, { [field]: value } as Partial<Task>);
    await loadTask();
  } catch (e: any) {
    message.error(e.response?.data?.error || '保存失败');
  }
}

async function addChild() {
  try { await childFormRef.value?.validate(); } catch { return; }
  try {
    await taskApi.create({
      ...childForm,
      parent_id: task.value?.id || null,
      iteration_id: task.value?.iteration_id || null,
    });
    message.success('子任务已创建');
    showChildForm.value = false;
    childForm.title = '';
    childForm.priority = 'medium';
    childForm.estimated_hours = 0;
    await loadTask();
  } catch (e: any) {
    message.error(e.response?.data?.error || '创建失败');
  }
}

async function saveChildField(id: string, field: string, value: unknown) {
  try {
    if (field === 'status') {
      await taskApi.changeStatus(id, String(value));
    } else {
      await taskApi.update(id, { [field]: value } as Partial<Task>);
    }
    await loadTask();
  } catch (e: any) {
    message.error(e.response?.data?.error || '子任务更新失败');
  }
}

function confirmDeleteTask(target: Task | null) {
  const t = target || task.value;
  if (!t) return;
  const isMain = t.id === task.value?.id;
  dialogApi.warning({
    title: '确认删除',
    content: isMain ? '确定要删除此任务吗？子任务也会被一起删除。' : `确定要删除子任务"${t.title}"吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await taskStore.deleteTask(t.id);
      if (isMain) router.back();
      else await loadTask();
      message.success('已删除');
    },
  });
}

function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

function statusLabel(status: string): string {
  return STATUS_CONFIG[status as TaskStatus]?.label || status;
}
</script>
