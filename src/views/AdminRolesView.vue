<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">角色与权限</div>
      <el-button @click="load">刷新</el-button>
      <el-button type="primary" @click="openCreate">新建角色</el-button>
    </div>
    <el-alert type="info" :closable="false" style="margin-bottom: 12px"
      title="权限位控制接口是否放行；可访问 schema 控制前端能看到的库与后端允许查询的范围。" />

    <el-table :data="roles" v-loading="loading" size="small">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="编码" width="130" />
      <el-table-column prop="name" label="名称" width="130" />
      <el-table-column label="权限位" min-width="320">
        <template #default="scope">
          <el-tag v-for="c in split(scope.row.capabilities)" :key="c" size="small" style="margin: 2px">{{ c }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="可用 schema" min-width="240">
        <template #default="scope">
          <el-tag v-for="s in split(scope.row.allowedSchemas)" :key="s" size="small" type="info" style="margin: 2px">{{ s }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="内置" width="80">
        <template #default="scope">{{ scope.row.builtIn ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="scope">
          <el-button size="small" @click="openEdit(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" :disabled="scope.row.builtIn" @click="remove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑角色' : '新建角色'" width="640px">
      <el-form label-width="110px">
        <el-form-item label="编码"><el-input v-model="form.code" :disabled="!!form.id && form.builtIn" placeholder="如 READER" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="权限位">
          <el-checkbox-group v-model="form.caps">
            <el-checkbox v-for="c in allCaps" :key="c" :value="c">{{ c }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="可用 schema">
          <el-checkbox-group v-model="form.schemas">
            <el-checkbox v-for="s in allSchemas" :key="s" :value="s">{{ s }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../api'

const allCaps = ['QUERY', 'RAW_SQL', 'CREATE_TABLE', 'DROP_TABLE', 'ALTER_COLUMN', 'INDEX', 'REVIEW', 'USER_ADMIN', 'QUESTION_ADMIN', 'AUDIT_VIEW']
const allSchemas = ['employees', 'employees_lab', 'practice', 'demo01', 'doubao_shop']
const roles = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const form = reactive<any>({ id: 0, code: '', name: '', caps: [] as string[], schemas: [] as string[], builtIn: false })

function split(value: string) {
  return (value || '').split(',').map((v) => v.trim()).filter(Boolean)
}

async function load() {
  loading.value = true
  try {
    roles.value = await adminApi.roles()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { id: 0, code: '', name: '', caps: ['QUERY', 'RAW_SQL'], schemas: [...allSchemas], builtIn: false })
  dialogVisible.value = true
}
function openEdit(row: any) {
  Object.assign(form, { id: row.id, code: row.code, name: row.name, caps: split(row.capabilities), schemas: split(row.allowedSchemas), builtIn: row.builtIn })
  dialogVisible.value = true
}

async function save() {
  const payload = { code: form.code, name: form.name, capabilities: form.caps.join(','), allowedSchemas: form.schemas.join(',') }
  if (form.id) await adminApi.updateRole(form.id, payload)
  else await adminApi.createRole(payload)
  ElMessage.success('已保存')
  dialogVisible.value = false
  load()
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除角色 ${row.name}？`, '确认', { type: 'warning' })
    await adminApi.deleteRole(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e) {}
}

onMounted(load)
</script>
