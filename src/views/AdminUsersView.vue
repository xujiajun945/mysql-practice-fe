<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">用户与审批</div>
      <el-input v-model="keyword" placeholder="搜索用户名/昵称" clearable style="width: 220px" />
      <el-button @click="load">刷新</el-button>
      <el-button type="primary" @click="openCreate">新建用户</el-button>
    </div>

    <el-table :data="filtered" v-loading="loading" size="small">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" width="130" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="roleName" label="角色" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag size="small" :type="statusType(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" min-width="170" />
      <el-table-column prop="rejectReason" label="拒绝原因" min-width="140" />
      <el-table-column label="操作" width="300">
        <template #default="scope">
          <el-button v-if="scope.row.status === 'PENDING'" size="small" type="success" @click="approve(scope.row)">通过</el-button>
          <el-button v-if="scope.row.status === 'PENDING'" size="small" type="danger" @click="reject(scope.row)">拒绝</el-button>
          <el-button size="small" @click="openEdit(scope.row)">修改</el-button>
          <el-button size="small" @click="resetPassword(scope.row)">重置密码</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createVisible" title="新建用户" width="480px">
      <el-form label-width="80px">
        <el-form-item label="用户名"><el-input v-model="createForm.username" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="createForm.nickname" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="createForm.password" type="password" show-password /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.roleId" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="`${r.name}（${r.code}）`" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="create">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" title="修改用户" width="480px">
      <el-form label-width="80px">
        <el-form-item label="昵称"><el-input v-model="editForm.nickname" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.roleId" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="`${r.name}（${r.code}）`" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="DISABLED" value="DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../api'

const users = ref<any[]>([])
const roles = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const createVisible = ref(false)
const editVisible = ref(false)
const createForm = reactive<any>({ username: '', nickname: '', password: '', roleId: undefined })
const editForm = reactive<any>({ id: 0, nickname: '', roleId: undefined, status: 'ACTIVE' })

const filtered = computed(() => users.value.filter((u) => !keyword.value || u.username.includes(keyword.value) || (u.nickname || '').includes(keyword.value)))

function statusType(status: string) {
  return status === 'ACTIVE' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'danger' : 'info'
}

async function load() {
  loading.value = true
  try {
    users.value = await adminApi.users()
    if (!roles.value.length) roles.value = await adminApi.roles()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(createForm, { username: '', nickname: '', password: '', roleId: roles.value[0]?.id })
  createVisible.value = true
}
async function create() {
  await adminApi.createUser({ ...createForm })
  ElMessage.success('已创建')
  createVisible.value = false
  load()
}
async function approve(row: any) {
  await adminApi.approve(row.id, row.roleId || undefined)
  ElMessage.success('已通过')
  load()
}
async function reject(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝用户', { inputPlaceholder: '可选' })
    await adminApi.reject(row.id, value)
    ElMessage.success('已拒绝')
    load()
  } catch (e) {}
}
function openEdit(row: any) {
  Object.assign(editForm, { id: row.id, nickname: row.nickname, roleId: row.roleId, status: row.status === 'PENDING' ? 'ACTIVE' : row.status })
  editVisible.value = true
}
async function saveEdit() {
  await adminApi.updateUser(editForm.id, { nickname: editForm.nickname, roleId: editForm.roleId, status: editForm.status })
  ElMessage.success('已保存')
  editVisible.value = false
  load()
}
async function resetPassword(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新密码（至少 6 位）', `重置 ${row.username} 的密码`)
    await adminApi.resetPassword(row.id, value)
    ElMessage.success('密码已重置')
  } catch (e) {}
}

onMounted(load)
</script>
