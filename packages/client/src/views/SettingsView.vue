<template>
  <MainLayout>
    <div class="max-w-2xl space-y-6">
      <PageHeader title="设置" />

      <!-- Personal Info -->
      <n-card size="small" class="card-no-hover">
        <template #header><span class="subsection-title">个人信息</span></template>
        <n-form :model="profileForm" label-placement="top" size="small">
          <n-form-item label="用户名">
            <n-input :value="authStore.user?.username" disabled />
          </n-form-item>
          <n-form-item label="显示名称">
            <n-input v-model:value="profileForm.display_name" placeholder="输入显示名称" />
          </n-form-item>
          <n-form-item label="新密码">
            <n-input v-model:value="profileForm.password" type="password" show-password-on="click" placeholder="留空则不修改" />
          </n-form-item>
        </n-form>
        <n-button type="primary" :loading="savingProfile" @click="saveProfile">保存</n-button>
      </n-card>

      <!-- WebDAV Backup (admin only) -->
      <n-card v-if="authStore.isAdmin" size="small" class="card-no-hover">
        <template #header><span class="subsection-title">WebDAV 自动备份</span></template>
        <n-form :model="form" label-placement="top" size="small">
          <n-form-item label="服务器地址">
            <n-input v-model:value="form.server_url" placeholder="https://dav.example.com" />
          </n-form-item>
          <div class="grid grid-cols-2 gap-3">
            <n-form-item label="用户名">
              <n-input v-model:value="form.username" />
            </n-form-item>
            <n-form-item label="密码">
              <n-input v-model:value="form.password" type="password" show-password-on="click" />
            </n-form-item>
          </div>
          <n-form-item label="远端路径">
            <n-input v-model:value="form.remote_path" placeholder="/time-backup/" />
          </n-form-item>
          <div class="grid grid-cols-2 gap-3">
            <n-form-item label="备份间隔（分钟）">
              <n-input-number v-model:value="form.interval_minutes" :min="5" class="w-full" />
            </n-form-item>
            <n-form-item label="启用自动备份">
              <n-switch v-model:value="enabledBool" />
            </n-form-item>
          </div>
        </n-form>

        <div class="my-4 h-px" style="background: var(--color-border)" />

        <div class="flex items-center gap-3">
          <n-button type="primary" :loading="saving" @click="saveConfig">保存配置</n-button>
          <n-button :loading="backing" @click="triggerBackup">立即备份</n-button>
        </div>

        <div v-if="config?.last_backup_at" class="mt-3">
          <span class="text-xs" style="color: var(--color-text-muted)">上次备份: {{ config.last_backup_at }}</span>
        </div>
      </n-card>

      <!-- Backup Management (admin only) -->
      <n-card v-if="authStore.isAdmin" size="small" class="card-no-hover">
        <template #header><span class="subsection-title">备份管理</span></template>

        <div class="flex items-center gap-3 mb-4">
          <n-button :loading="loadingList" @click="loadBackupList">刷新列表</n-button>
          <n-button :loading="cleaning" @click="doCleanup">清理旧备份</n-button>
          <span v-if="backupFiles.length" class="text-xs" style="color: var(--color-text-muted)">
            共 {{ backupFiles.length }} 个备份文件
          </span>
        </div>

        <n-data-table
          v-if="backupFiles.length"
          :columns="backupColumns"
          :data="backupFiles"
          :bordered="false"
          size="small"
          :max-height="320"
          :row-key="(row: BackupFile) => row.name"
        />
        <n-empty v-else-if="listLoaded" description="暂无备份文件" size="small" />
      </n-card>

      <!-- Restore confirmation modal -->
      <n-modal v-model:show="showRestoreModal" preset="dialog" type="warning" title="确认恢复"
        positive-text="确认恢复" negative-text="取消"
        :loading="restoring"
        @positive-click="confirmRestore"
      >
        <p>将从 <strong>{{ restoreTarget }}</strong> 恢复数据，当前数据库将被覆盖。</p>
        <p style="color: var(--color-text-muted)" class="text-xs mt-2">恢复前会自动备份当前数据到服务器临时目录。</p>
      </n-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue';
import { useMessage, type DataTableColumns, NButton, NTime } from 'naive-ui';
import { authApi, backupApi } from '@/api';
import type { BackupConfig } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';

interface BackupFile { name: string; lastmod: string; }

const message = useMessage();
const authStore = useAuthStore();

// --- Profile ---
const savingProfile = ref(false);
const profileForm = reactive({
  display_name: authStore.user?.display_name || '',
  password: '',
});

async function saveProfile() {
  savingProfile.value = true;
  try {
    const payload: { display_name?: string; password?: string } = {
      display_name: profileForm.display_name,
    };
    if (profileForm.password) {
      payload.password = profileForm.password;
    }
    const { data } = await authApi.updateProfile(payload);
    // Update local store
    if (authStore.user) {
      authStore.user.display_name = data.display_name;
      localStorage.setItem('user', JSON.stringify(authStore.user));
    }
    profileForm.password = '';
    message.success('个人信息已更新');
  } catch (e: any) {
    message.error(e.response?.data?.error || '保存失败');
  } finally {
    savingProfile.value = false;
  }
}

// --- Backup (admin only) ---
const config = ref<BackupConfig | null>(null);
const saving = ref(false);
const backing = ref(false);

const form = reactive({
  server_url: '',
  username: '',
  password: '',
  remote_path: '/time-backup/',
  interval_minutes: 60,
  enabled: 0,
});

const enabledBool = computed({
  get: () => form.enabled === 1,
  set: (v: boolean) => { form.enabled = v ? 1 : 0; },
});

onMounted(async () => {
  if (!authStore.isAdmin) return;
  try {
    const { data } = await backupApi.getConfig();
    config.value = data;
    form.server_url = data.server_url;
    form.username = data.username;
    form.password = data.password;
    form.remote_path = data.remote_path;
    form.interval_minutes = data.interval_minutes;
    form.enabled = data.enabled;
  } catch { /* ignore */ }
});

async function saveConfig() {
  saving.value = true;
  try {
    const { data } = await backupApi.updateConfig({ ...form });
    config.value = data;
    message.success('配置已保存');
  } catch (e: any) {
    message.error(e.response?.data?.error || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function triggerBackup() {
  backing.value = true;
  try {
    const { data } = await backupApi.trigger();
    if (data.success) message.success(data.message);
    else message.error(data.message);
    // Refresh list after backup
    if (listLoaded.value) await loadBackupList();
  } catch (e: any) {
    message.error(e.response?.data?.error || '备份失败');
  } finally {
    backing.value = false;
  }
}

// --- Backup Management (admin only) ---
const backupFiles = ref<BackupFile[]>([]);
const loadingList = ref(false);
const listLoaded = ref(false);
const cleaning = ref(false);
const restoring = ref(false);
const showRestoreModal = ref(false);
const restoreTarget = ref('');

const backupColumns: DataTableColumns<BackupFile> = [
  {
    title: '文件名',
    key: 'name',
    ellipsis: { tooltip: true },
  },
  {
    title: '修改时间',
    key: 'lastmod',
    width: 180,
    render(row) {
      return h(NTime, { time: new Date(row.lastmod), type: 'relative' });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render(row) {
      return h(NButton, {
        size: 'small',
        type: 'warning',
        quaternary: true,
        onClick: () => { restoreTarget.value = row.name; showRestoreModal.value = true; },
      }, { default: () => '恢复' });
    },
  },
];

async function loadBackupList() {
  loadingList.value = true;
  try {
    const { data } = await backupApi.status();
    backupFiles.value = data.files || [];
    listLoaded.value = true;
  } catch (e: any) {
    message.error(e.response?.data?.error || '获取备份列表失败');
  } finally {
    loadingList.value = false;
  }
}

async function confirmRestore() {
  restoring.value = true;
  try {
    const { data } = await backupApi.restore(restoreTarget.value);
    if (data.success) {
      message.success(data.message);
      // Database replaced — reload page to reset all stores
      setTimeout(() => window.location.reload(), 1000);
    } else {
      message.error(data.message);
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || '恢复失败');
  } finally {
    restoring.value = false;
    showRestoreModal.value = false;
  }
}

async function doCleanup() {
  cleaning.value = true;
  try {
    const { data } = await backupApi.cleanup();
    if (data.success) {
      message.success(data.message);
      if (listLoaded.value) await loadBackupList();
    } else {
      message.error(data.message);
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || '清理失败');
  } finally {
    cleaning.value = false;
  }
}
</script>
