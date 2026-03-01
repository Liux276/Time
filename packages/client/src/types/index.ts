// Auth types
export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SetupStatus {
  needsSetup: boolean;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  display_name?: string;
  role?: UserRole;
}

// Task types
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  parent_id: string | null;
  iteration_id: string | null;
  estimated_hours: number;
  completed_hours: number;
  remaining_hours: number;
  overtime_hours: number;
  progress: number;
  planned_start: string | null;
  planned_end: string | null;
  created_at: string;
  completed_at: string | null;
  sort_order: number;
  has_children?: boolean;
  children?: Task[];
  status_logs?: StatusLog[];
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high';

export interface StatusLog {
  id: string;
  task_id: string;
  from_status: string;
  to_status: string;
  changed_at: string;
}

// Iteration types
export interface Iteration {
  id: string;
  name: string;
  status: IterationStatus;
  planned_start: string;
  planned_end: string;
  summary: string;
  created_at: string;
  task_count: number;
  estimated_hours: number;
  completed_hours: number;
  remaining_hours: number;
}

export type IterationStatus = 'planning' | 'active' | 'completed';

// Stats types
export interface BurndownData {
  iteration_id: string;
  planned_start: string | null;
  planned_end: string | null;
  snapshots: Array<{
    snapshot_date: string;
    remaining_hours: number;
    completed_hours: number;
  }>;
  ideal_line: Array<{
    date: string;
    hours: number;
  }>;
}

export interface WorkloadStats {
  start_date: string;
  end_date: string;
  granularity: string;
  data: Array<{
    period: string;
    hours: number;
  }>;
  total_hours: number;
}

// Backup types
export interface BackupConfig {
  server_url: string;
  username: string;
  password: string;
  remote_path: string;
  interval_minutes: number;
  enabled: number;
  last_backup_at: string | null;
}

// UI types
export interface TaskFilter {
  status?: TaskStatus | '';
  priority?: Priority | '';
  iteration_id?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export type ColumnKey = 'title' | 'status' | 'priority' | 'iteration' | 'estimated_hours' |
  'completed_hours' | 'remaining_hours' | 'overtime_hours' | 'progress' |
  'planned_start' | 'planned_end' | 'created_at' | 'completed_at';

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  width?: string;
}

// Status display config
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: '未开始', color: 'text-gray-600', bg: 'bg-gray-100' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: '已取消', color: 'text-red-600', bg: 'bg-red-100' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low: { label: '低', color: 'text-gray-500', bg: 'bg-gray-100' },
  medium: { label: '中', color: 'text-blue-600', bg: 'bg-blue-100' },
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-100' },
};

export const ITERATION_STATUS_CONFIG: Record<IterationStatus, { label: string; color: string; bg: string }> = {
  planning: { label: '规划中', color: 'text-gray-600', bg: 'bg-gray-100' },
  active: { label: '执行中', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: '已结束', color: 'text-green-600', bg: 'bg-green-100' },
};

// Naive UI status type mapping
export const STATUS_NAIVE_TYPE: Record<TaskStatus, 'default' | 'info' | 'success' | 'error'> = {
  not_started: 'default',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
};

export const PRIORITY_NAIVE_TYPE: Record<Priority, 'default' | 'info' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'error',
};

export const ITERATION_STATUS_NAIVE_TYPE: Record<IterationStatus, 'default' | 'info' | 'success'> = {
  planning: 'default',
  active: 'info',
  completed: 'success',
};

// Valid status transitions
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['not_started', 'completed', 'cancelled'],
  completed: ['not_started', 'in_progress', 'cancelled'],
  cancelled: ['not_started', 'in_progress', 'completed'],
};

// Default columns
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'title', label: '标题', visible: true, width: '200' },
  { key: 'status', label: '状态', visible: true, width: '100' },
  { key: 'priority', label: '优先级', visible: true, width: '80' },
  { key: 'iteration', label: '迭代', visible: true, width: '120' },
  { key: 'estimated_hours', label: '预估工时', visible: true, width: '100' },
  { key: 'completed_hours', label: '完成工时', visible: true, width: '100' },
  { key: 'remaining_hours', label: '剩余工时', visible: false, width: '100' },
  { key: 'overtime_hours', label: '超出工时', visible: false, width: '100' },
  { key: 'progress', label: '进度', visible: false, width: '100' },
  { key: 'planned_start', label: '预计开始', visible: false, width: '120' },
  { key: 'planned_end', label: '预计结束', visible: false, width: '120' },
  { key: 'created_at', label: '创建时间', visible: false, width: '160' },
  { key: 'completed_at', label: '完成时间', visible: false, width: '160' },
];
