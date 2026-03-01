<template>
  <MainLayout>
    <div class="max-w-4xl space-y-6">
      <PageHeader title="用户管理">
        <template #actions>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><AppIcon name="add" :size="16" /></template>
            新建用户
          </n-button>
        </template>
      </PageHeader>

      <!-- User list -->
      <n-card size="small" class="card-no-hover">
        <n-data-table
          :columns="columns"
          :data="users"
          :loading="loading"
          :row-key="(row: User) => row.id"
          size="small"
        />
      </n-card>

      <!-- Create user modal -->
      <n-modal v-model:show="showCreateModal" preset="card" title="新建用户" style="max-width: 420px" :mask-closable="false">
        <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="top" size="small">
          <n-form-item label="用户名" path="username">
            <n-input v-model:value="createForm.username" placeholder="请输入用户名" />
          </n-form-item>
          <n-form-item label="显示名称" path="display_name">
            <n-input v-model:value="createForm.display_name" placeholder="可选" />
          </n-form-item>
          <n-form-item label="密码" path="password">
            <n-input v-model:value="createForm.password" type="password" show-password-on="click" placeholder="请输入密码" />
          </n-form-item>
          <n-form-item label="角色" path="role">
            <n-select v-model:value="createForm.role" :options="roleOptions" />
          </n-form-item>
        </n-form>
        <div class="flex justify-end gap-3 mt-4">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="handleCreate">创建</n-button>
        </div>
      </n-modal>

      <!-- Edit user modal -->
      <n-modal v-model:show="showEditModal" preset="card" title="编辑用户" style="max-width: 420px" :mask-closable="false">
        <n-form ref="editFormRef" :model="editForm" label-placement="top" size="small">
          <n-form-item label="用户名">
            <n-input :value="editForm.username" disabled />
          </n-form-item>
          <n-form-item label="显示名称">
            <n-input v-model:value="editForm.display_name" placeholder="可选" />
          </n-form-item>
          <n-form-item label="新密码">
            <n-input v-model:value="editForm.password" type="password" show-password-on="click" placeholder="留空则不修改" />
          </n-form-item>
          <n-form-item label="角色">
            <n-select v-model:value="editForm.role" :options="roleOptions" />
          </n-form-item>
        </n-form>
        <div class="flex justify-end gap-3 mt-4">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="editing" @click="handleEdit">保存</n-button>
        </div>
      </n-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue';
import { NButton, NTag, useMessage, useDialog, type FormInst, type FormRules, type DataTableColumns } from 'naive-ui';
import { authApi } from '@/api';
import type { User, UserRole } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import AppIcon from '@/components/common/AppIcon.vue';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const users = ref<User[]>([]);
const loading = ref(false);

// Create form
const showCreateModal = ref(false);
const creating = ref(false);
const createFormRef = ref<FormInst | null>(null);
const createForm = reactive({
  username: '',
  display_name: '',
  password: '',
  role: 'user' as UserRole,
});

const createRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 32, message: '用户名长度 2-32 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 128, message: '密码长度 6-128 位', trigger: 'blur' },
  ],
};

// Edit form
const showEditModal = ref(false);
const editing = ref(false);
const editFormRef = ref<FormInst | null>(null);
const editUserId = ref<string | number>('');
const editForm = reactive({
  username: '',
  display_name: '',
  password: '',
  role: 'user' as UserRole,
});

const roleOptions = [
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
];

const columns: DataTableColumns<User> = [
  {
    title: '用户名',
    key: 'username',
    width: 140,
  },
  {
    title: '显示名称',
    key: 'display_name',
    width: 160,
  },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render(row) {
      return h(NTag, {
        type: row.role === 'admin' ? 'warning' : 'default',
        round: true,
        bordered: false,
        size: 'small',
      }, { default: () => row.role === 'admin' ? '管理员' : '普通用户' });
    },
  },
  {
    title: '创建时间',
    key: 'created_at',
    width: 180,
    render(row) {
      return row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '';
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render(row) {
      const isSelf = row.id === authStore.user?.id;
      return h('div', { class: 'flex gap-2' }, [
        h(NButton, {
          size: 'small',
          quaternary: true,
          circle: true,
          title: '编辑',
          onClick: () => openEdit(row),
        }, { default: () => h(AppIcon, { name: 'edit', size: 16 }) }),
        h(NButton, {
          size: 'small',
          quaternary: true,
          circle: true,
          disabled: isSelf,
          title: isSelf ? '不能删除自己' : '删除',
          onClick: () => confirmDelete(row),
        }, { default: () => h(AppIcon, { name: 'delete', size: 16 }) }),
      ]);
    },
  },
];

onMounted(() => fetchUsers());

async function fetchUsers() {
  loading.value = true;
  try {
    const { data } = await authApi.listUsers();
    users.value = data;
  } catch (e: any) {
    message.error(e.response?.data?.error || '获取用户列表失败');
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  try {
    await createFormRef.value?.validate();
  } catch { return; }

  creating.value = true;
  try {
    await authApi.createUser({
      username: createForm.username,
      password: createForm.password,
      display_name: createForm.display_name || undefined,
      role: createForm.role,
    });
    message.success('用户创建成功');
    showCreateModal.value = false;
    Object.assign(createForm, { username: '', display_name: '', password: '', role: 'user' });
    await fetchUsers();
  } catch (e: any) {
    message.error(e.response?.data?.error || '创建失败');
  } finally {
    creating.value = false;
  }
}

function openEdit(user: User) {
  editUserId.value = user.id;
  editForm.username = user.username;
  editForm.display_name = user.display_name;
  editForm.password = '';
  editForm.role = user.role;
  showEditModal.value = true;
}

async function handleEdit() {
  editing.value = true;
  try {
    const payload: Record<string, string> = {
      display_name: editForm.display_name,
      role: editForm.role,
    };
    if (editForm.password) {
      payload.password = editForm.password;
    }
    await authApi.updateUser(editUserId.value, payload);
    message.success('用户更新成功');
    showEditModal.value = false;
    await fetchUsers();
  } catch (e: any) {
    message.error(e.response?.data?.error || '更新失败');
  } finally {
    editing.value = false;
  }
}

function confirmDelete(user: User) {
  if (user.id === authStore.user?.id) return;
  dialog.warning({
    title: '确认删除',
    content: `确定删除用户「${user.display_name || user.username}」？该操作不可撤销，该用户的所有数据（任务、迭代等）将被一并删除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await authApi.deleteUser(user.id);
        message.success('用户已删除');
        await fetchUsers();
      } catch (e: any) {
        message.error(e.response?.data?.error || '删除失败');
      }
    },
  });
}
</script>
