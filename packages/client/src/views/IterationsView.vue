<template>
  <MainLayout>
    <div>
      <!-- ===== Mobile: card list (no route id) ===== -->
      <template v-if="!isDesktop && !routeId">
        <PageHeader title="迭代">
          <template #actions>
            <n-button type="primary" size="small" @click="showForm = true">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新建迭代
            </n-button>
          </template>
        </PageHeader>

        <div v-if="iterationStore.iterations.length > 0" class="space-y-3">
          <IterationCard
            v-for="iter in iterationStore.iterations"
            :key="iter.id"
            :iteration="iter"
            :selected="false"
            @select="id => router.push(`/iterations/${id}`)"
          />
        </div>

        <div v-else-if="!loading" class="card-glass p-12 text-center card-no-hover">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4" style="background: var(--color-accent-light)">
            <AppIcon name="iteration" :size="28" color="var(--color-accent)" />
          </div>
          <p class="text-sm-body mb-4" style="color: var(--color-text-secondary)">暂无迭代</p>
          <n-button type="primary" size="small" @click="showForm = true">创建第一个迭代</n-button>
        </div>

        <n-spin v-if="loading" class="flex justify-center py-12" />
      </template>

      <!-- ===== Desktop: master-detail / Mobile: detail only ===== -->
      <template v-else>
        <div class="flex gap-6">
          <!-- Left sidebar: iteration card list (desktop only) -->
          <div class="hidden lg:flex lg:flex-col w-80 flex-shrink-0">
            <div class="flex items-center justify-between mb-4">
              <span class="text-base font-semibold" style="color: var(--color-text-primary)">迭代</span>
              <n-button type="primary" size="small" @click="showForm = true">
                <template #icon><n-icon><AddOutline /></n-icon></template>
                新建
              </n-button>
            </div>
            <div class="space-y-3 overflow-y-auto px-1 py-1" style="max-height: calc(100vh - 140px)">
              <IterationCard
                v-for="iter in iterationStore.iterations"
                :key="iter.id"
                :iteration="iter"
                :selected="iteration?.id === iter.id"
                @select="selectIteration"
              />
              <div v-if="iterationStore.iterations.length === 0 && !loading" class="text-center py-8">
                <p class="text-caption" style="color: var(--color-text-tertiary)">暂无迭代</p>
              </div>
            </div>
          </div>

          <!-- Right main: iteration detail -->
          <div class="flex-1 min-w-0">
            <PageHeader :title="iteration?.name || '加载中...'" :showBack="!isDesktop && !!routeId">
              <template #after-title>
                <n-tag v-if="iteration" :type="ITERATION_STATUS_NAIVE_TYPE[iteration.status]" size="small" round>
                  {{ ITERATION_STATUS_CONFIG[iteration.status]?.label }}
                </n-tag>
              </template>
              <template #actions>
                <!-- Mobile: show create button in header -->
                <n-button v-if="!isDesktop" type="primary" size="small" @click="showForm = true">
                  <template #icon><n-icon><AddOutline /></n-icon></template>
                  新建迭代
                </n-button>
              </template>
            </PageHeader>

            <template v-if="iteration">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main column -->
                <div class="lg:col-span-2 space-y-6">
                  <!-- Stat Cards -->
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard :value="iteration.task_count" label="任务数量" icon="task" accent="var(--color-accent)" />
                    <StatCard :value="iteration.estimated_hours" suffix="h" label="预估工时" icon="clock" accent="var(--color-info)" />
                    <StatCard :value="iteration.completed_hours" suffix="h" label="完成工时" icon="check-circle" accent="var(--color-success)" />
                    <StatCard :value="iteration.remaining_hours" suffix="h" label="剩余工时" icon="trending-up" accent="var(--color-warning)" />
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
                        <n-button type="primary" size="small" @click="showAddTask = true">添加任务</n-button>
                      </div>
                    </template>

                    <!-- Table mode -->
                    <n-data-table
                      v-if="iterationTasks.length > 0 && displayMode === 'table'"
                      :columns="taskColumns"
                      :data="iterationTasks"
                      :row-key="(row: Task) => row.id"
                      :bordered="false"
                      size="small"
                      :max-height="500"
                      :children-key="'children'"
                      :default-expand-all="true"
                      :scroll-x="tableScrollX"
                      striped
                    />

                    <!-- Card mode -->
                    <div v-else-if="iterationTasks.length > 0" class="space-y-3">
                      <div
                        v-for="item in flattenedTasks"
                        :key="item.task.id"
                        class="card-solid p-4 stagger-item cursor-pointer transition-all hover:shadow-md"
                        :style="{ marginLeft: `${Math.min(item.depth, 6) * 16}px` }"
                        @click="router.push(`/requirements/${item.task.id}`)"
                      >
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
                        <div class="grid grid-cols-2 gap-2 text-caption mb-3">
                          <span>工时：{{ item.task.completed_hours }}/{{ item.task.estimated_hours }}h</span>
                          <span>剩余：{{ item.task.remaining_hours }}h</span>
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

                    <n-empty v-else description="该迭代暂无任务" />
                  </n-card>
                </div>

                <!-- Sidebar -->
                <div class="space-y-4">
                  <n-card size="small" class="card-no-hover">
                    <div class="space-y-1">
                      <button class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-surface" @click="openFieldEditor('name')">
                        <span class="text-caption block" style="color: var(--color-text-tertiary)">名称</span>
                        <span class="text-sm-body font-medium" style="color: var(--color-text-primary)">{{ iteration.name }}</span>
                      </button>
                      <button class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-surface" @click="openFieldEditor('status')">
                        <span class="text-caption block" style="color: var(--color-text-tertiary)">状态</span>
                        <span class="text-sm-body" style="color: var(--color-text-primary)">{{ ITERATION_STATUS_CONFIG[iteration.status].label }}</span>
                      </button>
                      <button class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-surface" @click="openFieldEditor('planned_start')">
                        <span class="text-caption block" style="color: var(--color-text-tertiary)">开始时间</span>
                        <span class="text-sm-body" style="color: var(--color-text-primary)">{{ iteration.planned_start || '-' }}</span>
                      </button>
                      <button class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-surface" @click="openFieldEditor('planned_end')">
                        <span class="text-caption block" style="color: var(--color-text-tertiary)">结束时间</span>
                        <span class="text-sm-body" style="color: var(--color-text-primary)">{{ iteration.planned_end || '-' }}</span>
                      </button>
                      <button class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-surface" @click="openFieldEditor('summary')">
                        <span class="text-caption block" style="color: var(--color-text-tertiary)">总结</span>
                        <span class="block max-w-full whitespace-nowrap overflow-hidden text-ellipsis text-sm-body" style="color: var(--color-text-primary)">{{ iteration.summary || '未填写' }}</span>
                      </button>
                    </div>
                  </n-card>

                  <!-- Stats sidebar card -->
                  <n-card size="small" class="card-no-hover">
                    <div class="grid grid-cols-2 gap-3">
                      <div class="text-center p-2">
                        <div class="text-h3 font-bold" style="color: var(--color-accent)">{{ iteration.task_count }}</div>
                        <div class="text-caption" style="color: var(--color-text-tertiary)">任务</div>
                      </div>
                      <div class="text-center p-2">
                        <div class="text-h3 font-bold" style="color: var(--color-info)">{{ iteration.estimated_hours }}h</div>
                        <div class="text-caption" style="color: var(--color-text-tertiary)">预估</div>
                      </div>
                      <div class="text-center p-2">
                        <div class="text-h3 font-bold" style="color: var(--color-success)">{{ iteration.completed_hours }}h</div>
                        <div class="text-caption" style="color: var(--color-text-tertiary)">完成</div>
                      </div>
                      <div class="text-center p-2">
                        <div class="text-h3 font-bold" style="color: var(--color-warning)">{{ iteration.remaining_hours }}h</div>
                        <div class="text-caption" style="color: var(--color-text-tertiary)">剩余</div>
                      </div>
                    </div>
                  </n-card>

                  <n-button type="error" secondary size="small" block @click="confirmDelete">删除迭代</n-button>
                </div>
              </div>
            </template>

            <!-- Empty state (detail pane) -->
            <div v-else-if="!loading" class="card-glass p-12 text-center card-no-hover">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4" style="background: var(--color-accent-light)">
                <AppIcon name="iteration" :size="28" color="var(--color-accent)" />
              </div>
              <p class="text-sm-body mb-4" style="color: var(--color-text-secondary)">暂无迭代</p>
              <n-button type="primary" size="small" @click="showForm = true">创建第一个迭代</n-button>
            </div>

            <n-spin v-if="loading" class="flex justify-center py-12" />
          </div>
        </div>
      </template>

      <!-- Create iteration modal -->
      <n-modal v-model:show="showForm" preset="card" title="新建迭代" :style="{ width: '500px' }" :mask-closable="false">
        <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top">
          <n-form-item label="迭代名称" path="name">
            <n-input v-model:value="form.name" placeholder="请输入迭代名称" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="开始时间" path="planned_start">
                <n-date-picker v-model:formatted-value="form.planned_start" type="date" value-format="yyyy-MM-dd" class="w-full" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="结束时间" path="planned_end">
                <n-date-picker v-model:formatted-value="form.planned_end" type="date" value-format="yyyy-MM-dd" class="w-full" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-form-item label="迭代总结" path="summary">
            <n-input v-model:value="form.summary" type="textarea" :rows="3" placeholder="可选" />
          </n-form-item>
        </n-form>
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button @click="showForm = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="createIteration">创建</n-button>
          </div>
        </template>
      </n-modal>

      <!-- Add task modal -->
      <n-modal v-model:show="showAddTask" preset="card" title="添加任务" :style="{ width: '500px' }" :mask-closable="false">
        <n-form ref="addFormRef" :model="addTaskForm" :rules="{ title: [{ required: true, message: '请输入标题' }] }" label-placement="top">
          <n-form-item label="标题" path="title">
            <n-input v-model:value="addTaskForm.title" placeholder="请输入任务标题" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="优先级">
                <n-select v-model:value="addTaskForm.priority" :options="priorityOptions" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="预估工时">
                <n-input-number v-model:value="addTaskForm.estimated_hours" :min="0" :step="0.5" class="w-full" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-form>
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button @click="showAddTask = false">取消</n-button>
            <n-button type="primary" @click="addTask">创建</n-button>
          </div>
        </template>
      </n-modal>

      <!-- Field editor modal -->
      <n-modal v-model:show="fieldEditor.show" preset="card" :title="fieldEditorTitle" :style="{ width: '440px' }" :mask-closable="false">
        <n-form label-placement="top">
          <n-form-item v-if="fieldEditor.field === 'name'" label="名称">
            <n-input v-model:value="fieldEditor.value" placeholder="请输入迭代名称" />
          </n-form-item>
          <n-form-item v-else-if="fieldEditor.field === 'status'" label="状态">
            <n-select v-model:value="fieldEditor.value" :options="iterStatusEditorOptions" />
          </n-form-item>
          <n-form-item v-else-if="fieldEditor.field === 'planned_start'" label="开始时间">
            <n-date-picker v-model:formatted-value="fieldEditor.value" type="date" value-format="yyyy-MM-dd" class="w-full" clearable />
          </n-form-item>
          <n-form-item v-else-if="fieldEditor.field === 'planned_end'" label="结束时间">
            <n-date-picker v-model:formatted-value="fieldEditor.value" type="date" value-format="yyyy-MM-dd" class="w-full" clearable />
          </n-form-item>
          <n-form-item v-else label="迭代总结">
            <n-input v-model:value="fieldEditor.value" type="textarea" :rows="5" placeholder="请输入迭代总结" />
          </n-form-item>
        </n-form>
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button @click="fieldEditor.show = false">取消</n-button>
            <n-button type="primary" @click="saveFieldEditor">保存</n-button>
          </div>
        </template>
      </n-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog, type FormInst, type FormRules, NTag, NProgress, NInput, NSelect, NButton, NInputNumber } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import { useBreakpoints } from '@vueuse/core';
import { useIterationStore } from '@/stores/iterationStore';
import { taskApi } from '@/api';
import type { Task, Iteration, Priority, IterationStatus } from '@/types';
import { ITERATION_STATUS_CONFIG, ITERATION_STATUS_NAIVE_TYPE, STATUS_CONFIG, STATUS_NAIVE_TYPE, PRIORITY_CONFIG, PRIORITY_NAIVE_TYPE } from '@/types';
import { useTablePrefs } from '@/composables/useTablePrefs';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import StatCard from '@/components/common/StatCard.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import IterationCard from '@/components/iteration/IterationCard.vue';

const modeStorageKey = 'task-view-mode:iterations-home';
type TaskListDisplayMode = 'table' | 'card';
type IterationField = 'name' | 'status' | 'planned_start' | 'planned_end' | 'summary';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialogApi = useDialog();
const iterationStore = useIterationStore();
const breakpoints = useBreakpoints({ sm: 640, md: 768, lg: 1024 });
const isMobile = breakpoints.smaller('sm');
const isDesktop = breakpoints.greaterOrEqual('lg');

const routeId = computed(() => route.params.id as string | undefined);

const iteration = ref<Iteration | null>(null);
const iterationTasks = ref<Task[]>([]);
const loading = ref(true);
const showForm = ref(false);
const submitting = ref(false);
const formRef = ref<FormInst | null>(null);
const editingCell = ref<{ id: string; field: string } | null>(null);
const displayMode = ref<TaskListDisplayMode>((localStorage.getItem(modeStorageKey) as TaskListDisplayMode) || 'table');

// Add task modal
const showAddTask = ref(false);
const addFormRef = ref<FormInst | null>(null);
const addTaskForm = reactive({
  title: '',
  priority: 'medium' as Priority,
  estimated_hours: 0,
});

// Field editor modal
const fieldEditor = reactive({
  show: false,
  field: 'name' as IterationField,
  value: '' as string | null,
});

watch(displayMode, (mode) => {
  localStorage.setItem(modeStorageKey, mode);
});

const form = reactive({
  name: '',
  planned_start: null as string | null,
  planned_end: null as string | null,
  summary: '',
});

const formRules: FormRules = {
  name: [{ required: true, message: '请输入迭代名称', trigger: 'blur' }],
  planned_start: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  planned_end: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
};

const statusOptions = Object.entries(STATUS_CONFIG).map(([value, c]) => ({ label: c.label, value }));
const priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, c]) => ({ label: c.label, value }));
const iterationOptions = computed(() => iterationStore.iterations.map(i => ({ label: i.name, value: i.id })));
const iterStatusEditorOptions = Object.entries(ITERATION_STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label }));

const fieldEditorTitle = computed(() => {
  const titleMap: Record<IterationField, string> = {
    name: '编辑迭代名称',
    status: '编辑迭代状态',
    planned_start: '编辑开始时间',
    planned_end: '编辑结束时间',
    summary: '编辑迭代总结',
  };
  return titleMap[fieldEditor.field];
});

const { selected: columnSelected, options: columnOptions, isVisible } = useTablePrefs('iterations-home', [
  { key: 'title', label: '标题', mandatory: true },
  { key: 'status', label: '状态' },
  { key: 'priority', label: '优先级' },
  { key: 'iteration_id', label: '迭代', defaultVisible: false },
  { key: 'estimated_hours', label: '预估工时' },
  { key: 'completed_hours', label: '完成工时' },
  { key: 'progress', label: '进度' },
  { key: 'hours', label: '工时总览', defaultVisible: false },
]);

const tableScrollX = computed(() => (isMobile.value ? 860 : 1100));

const flattenedTasks = computed(() => {
  const output: Array<{ task: Task; depth: number }> = [];
  const walk = (tasks: Task[], depth: number) => {
    for (const task of tasks) {
      output.push({ task, depth });
      if (task.children?.length) walk(task.children, depth + 1);
    }
  };
  walk(iterationTasks.value, 0);
  return output;
});

const taskColumns = computed(() => [
  {
    title: '标题',
    key: 'title',
    minWidth: 320,
    ellipsis: { tooltip: true },
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'title') {
        return h(NInput, {
          defaultValue: row.title,
          size: 'small',
          autofocus: true,
          onBlur: (e: FocusEvent) => {
            const val = (e.target as HTMLInputElement).value;
            if (val && val !== row.title) saveTaskField(row.id, 'title', val);
            editingCell.value = null;
          },
          onKeyup: (e: KeyboardEvent) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') editingCell.value = null;
          },
        });
      }
      return h('div', { class: 'group flex items-center gap-1 min-w-0' }, [
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
            await saveTaskField(row.id, 'status', val);
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
      }, () => STATUS_CONFIG[row.status].label);
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
            await saveTaskField(row.id, 'priority', val);
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
      }, () => PRIORITY_CONFIG[row.priority].label);
    },
  },
  {
    title: '迭代',
    key: 'iteration_id',
    minWidth: 130,
    hidden: !isVisible('iteration_id'),
    render(row: Task) {
      if (editingCell.value?.id === row.id && editingCell.value?.field === 'iteration_id') {
        return h(NSelect, {
          value: row.iteration_id,
          options: iterationOptions.value,
          size: 'small',
          clearable: true,
          placeholder: '无',
          consistentMenuWidth: false,
          onUpdateValue: async (val: string | null) => {
            await saveTaskField(row.id, 'iteration_id', val);
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
    minWidth: 84,
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
            if (next !== row.estimated_hours) await saveTaskField(row.id, 'estimated_hours', next);
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
    minWidth: 84,
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
            if (next !== row.completed_hours) await saveTaskField(row.id, 'completed_hours', next);
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
    title: '进度',
    key: 'progress',
    minWidth: 120,
    hidden: !isVisible('progress'),
    render(row: Task) {
      return h(NProgress, {
        type: 'line',
        percentage: row.progress,
        indicatorPlacement: 'inside',
        height: 18,
        borderRadius: 4,
        processing: row.status === 'in_progress',
      });
    },
  },
  {
    title: '工时',
    key: 'hours',
    minWidth: 96,
    hidden: !isVisible('hours'),
    render(row: Task) {
      return `${row.completed_hours}/${row.estimated_hours}h`;
    },
  },
].filter((column) => !(column as { hidden?: boolean }).hidden));

function buildTaskTree(tasks: Task[]): Task[] {
  const map = new Map<string, Task>();
  tasks.forEach((task) => map.set(task.id, { ...task, children: [] }));
  const roots: Task[] = [];
  map.forEach((task) => {
    if (task.parent_id && map.has(task.parent_id)) {
      map.get(task.parent_id)!.children!.push(task);
    } else {
      roots.push(task);
    }
  });
  return roots;
}

function openFieldEditor(field: IterationField) {
  if (!iteration.value) return;
  fieldEditor.field = field;
  fieldEditor.value = iteration.value[field] ?? '';
  fieldEditor.show = true;
}

function applyIteration(updated: Iteration) {
  iteration.value = updated;
}

/** Desktop: click sidebar card to switch iteration (replace URL to avoid history piling) */
function selectIteration(id: string) {
  router.replace(`/iterations/${id}`);
}

let loadRequestId = 0;

async function loadData() {
  const reqId = ++loadRequestId;
  loading.value = true;
  try {
    await iterationStore.fetchIterations();

    // On mobile card-list view (no routeId), skip loading detail
    if (!isDesktop.value && !routeId.value) {
      return;
    }

    const id = routeId.value;
    let iterData: Iteration | null;
    if (id) {
      iterData = await iterationStore.fetchById(id);
    } else {
      iterData = await iterationStore.fetchLatest();
    }
    if (loadRequestId !== reqId) return;
    if (iterData) {
      applyIteration(iterData);
      const resp = await taskApi.list({ iteration_id: iterData.id, page_size: 500 });
      if (loadRequestId !== reqId) return;
      iterationTasks.value = buildTaskTree(resp.data.data);
    } else {
      iteration.value = null;
      iterationTasks.value = [];
    }
  } finally {
    if (loadRequestId === reqId) {
      loading.value = false;
    }
  }
}

onMounted(() => {
  if (isMobile.value && !localStorage.getItem('table-prefs:iterations-home')) {
    columnSelected.value = ['status', 'estimated_hours', 'completed_hours', 'progress'];
  }
  loadData();
});

watch(() => route.params.id, () => {
  loadData();
});

async function createIteration() {
  try { await formRef.value?.validate(); } catch { return; }
  submitting.value = true;
  try {
    const created = await iterationStore.createIteration({
      name: form.name,
      planned_start: form.planned_start!,
      planned_end: form.planned_end!,
      summary: form.summary,
    });
    message.success('迭代创建成功');
    showForm.value = false;
    form.name = '';
    form.planned_start = null;
    form.planned_end = null;
    form.summary = '';
    // Navigate to the newly created iteration
    if (created?.id) {
      router.replace(`/iterations/${created.id}`);
    } else {
      await loadData();
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || '创建失败');
  } finally {
    submitting.value = false;
  }
}

async function addTask() {
  try { await addFormRef.value?.validate(); } catch { return; }
  try {
    await taskApi.create({
      ...addTaskForm,
      iteration_id: iteration.value?.id || null,
    });
    message.success('任务已创建');
    showAddTask.value = false;
    addTaskForm.title = '';
    addTaskForm.priority = 'medium';
    addTaskForm.estimated_hours = 0;
    await loadData();
  } catch (e: any) {
    message.error(e.response?.data?.error || '创建失败');
  }
}

async function saveFieldEditor() {
  if (!iteration.value) return;
  try {
    if (fieldEditor.field === 'status') {
      const updated = await iterationStore.changeStatus(iteration.value.id, String(fieldEditor.value) as IterationStatus);
      applyIteration(updated);
    } else {
      const payload = { [fieldEditor.field]: fieldEditor.value } as Partial<Iteration>;
      const updated = await iterationStore.updateIteration(iteration.value.id, payload);
      applyIteration(updated);
    }
    fieldEditor.show = false;
    message.success('已更新');
  } catch (e: any) {
    message.error(e.response?.data?.error || '保存失败');
  }
}

async function saveTaskField(id: string, field: string, value: unknown) {
  try {
    const taskResp = field === 'status'
      ? await taskApi.changeStatus(id, String(value))
      : await taskApi.update(id, { [field]: value } as Partial<Task>);
    if (field === 'iteration_id') {
      await loadData();
      return;
    }
    const patchTask = (rows: Task[]): boolean => {
      for (const row of rows) {
        if (row.id === id) {
          Object.assign(row, taskResp.data);
          return true;
        }
        if (row.children?.length && patchTask(row.children)) return true;
      }
      return false;
    };
    patchTask(iterationTasks.value);
    if (iteration.value) {
      const id2 = routeId.value || iteration.value.id;
      applyIteration(await iterationStore.fetchById(id2));
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || '更新失败');
  }
}

function confirmDelete() {
  dialogApi.warning({
    title: '确认删除',
    content: '确定要删除此迭代吗？关联的任务不会被删除，但迭代字段会被清空。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (!iteration.value) return;
      await iterationStore.deleteIteration(iteration.value.id);
      message.success('迭代已删除');
      iteration.value = null;
      iterationTasks.value = [];
      router.replace('/iterations');
    },
  });
}
</script>
