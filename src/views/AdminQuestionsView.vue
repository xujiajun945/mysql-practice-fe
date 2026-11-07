<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">题库管理</div>
      <el-input v-model="keyword" placeholder="搜索标题/标签" clearable style="width: 220px" />
      <el-select v-model="difficulty" placeholder="难度" clearable style="width: 130px">
        <el-option label="EASY" value="EASY" />
        <el-option label="MEDIUM" value="MEDIUM" />
        <el-option label="HARD" value="HARD" />
      </el-select>
      <el-button @click="load">刷新</el-button>
      <el-button type="primary" @click="openCreate">新建题目</el-button>
      <span class="muted">共 {{ filtered.length }} / {{ questions.length }} 题</span>
    </div>

    <el-table :data="filtered" v-loading="loading" size="small" max-height="640">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="240" />
      <el-table-column prop="difficulty" label="难度" width="90" />
      <el-table-column prop="tags" label="标签" min-width="160" />
      <el-table-column prop="orderSensitive" label="顺序敏感" width="90">
        <template #default="scope">{{ scope.row.orderSensitive ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column prop="enabled" label="启用" width="70">
        <template #default="scope">{{ scope.row.enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210">
        <template #default="scope">
          <el-button size="small" @click="openEdit(scope.row)">编辑</el-button>
          <el-button size="small" @click="test(scope.row)">实测</el-button>
          <el-button size="small" type="danger" @click="remove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑题目' : '新建题目'" width="860px">
      <el-form label-width="100px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="题目描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="难度">
              <el-select v-model="form.difficulty" style="width: 100%">
                <el-option label="EASY" value="EASY" />
                <el-option label="MEDIUM" value="MEDIUM" />
                <el-option label="HARD" value="HARD" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="16"><el-form-item label="标签"><el-input v-model="form.tags" placeholder="逗号分隔" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="参考 SQL">
          <SqlEditor v-model="form.referenceSql" height="160px" />
        </el-form-item>
        <el-form-item label="解析"><el-input v-model="form.explanation" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="选项">
          <el-checkbox v-model="form.orderSensitive">结果顺序敏感</el-checkbox>
          <el-checkbox v-model="form.enabled">启用</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="testVisible" title="参考 SQL 实测结果" width="720px">
      <div v-if="testResult">
        <div class="toolbar">
          <el-tag type="success" size="small">执行成功</el-tag>
          <span class="muted">返回 {{ testResult.rowCount }} 行（最多展示 50 行）</span>
        </div>
        <div style="overflow: auto; max-height: 420px">
          <table class="result-table">
            <tbody>
              <tr v-for="(row, i) in testResult.rows" :key="i">
                <td v-for="(cell, j) in row" :key="j">{{ cell === null ? 'NULL' : cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SqlEditor from '../components/SqlEditor.vue'
import { adminApi } from '../api'

const questions = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const difficulty = ref('')
const dialogVisible = ref(false)
const testVisible = ref(false)
const testResult = ref<any>(null)
const form = reactive<any>({})

const filtered = computed(() =>
  questions.value.filter(
    (q) =>
      (!difficulty.value || q.difficulty === difficulty.value) &&
      (!keyword.value || (q.title || '').includes(keyword.value) || (q.tags || '').includes(keyword.value))
  )
)

async function load() {
  loading.value = true
  try {
    questions.value = await adminApi.questions()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { id: 0, title: '', description: '', difficulty: 'EASY', tags: '', referenceSql: 'SELECT 1;', explanation: '', orderSensitive: 0, enabled: 1 })
  dialogVisible.value = true
}
function openEdit(row: any) {
  Object.assign(form, { ...row, orderSensitive: row.orderSensitive ? 1 : 0, enabled: row.enabled ? 1 : 0 })
  dialogVisible.value = true
}

async function save() {
  const payload = {
    title: form.title,
    description: form.description,
    difficulty: form.difficulty,
    tags: form.tags,
    referenceSql: form.referenceSql,
    explanation: form.explanation,
    orderSensitive: form.orderSensitive ? 1 : 0,
    enabled: form.enabled ? 1 : 0
  }
  if (form.id) await adminApi.updateQuestion(form.id, payload)
  else await adminApi.createQuestion(payload)
  ElMessage.success('已保存')
  dialogVisible.value = false
  load()
}

async function test(row: any) {
  testResult.value = await adminApi.testQuestion(row.id)
  testVisible.value = true
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除题目 #${row.id}？`, '确认', { type: 'warning' })
    await adminApi.deleteQuestion(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e) {}
}

onMounted(load)
</script>
