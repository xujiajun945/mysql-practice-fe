<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">自定义 SQL</div>
      <el-select v-model="schema" style="width: 180px">
        <el-option v-for="s in auth.schemas" :key="s" :label="s" :value="s" />
      </el-select>
      <el-button type="primary" :loading="running" @click="run">执行（Ctrl/⌘ + Enter）</el-button>
      <span class="muted" v-if="result">耗时 {{ result.elapsedMs }} ms · {{ result.rowCount }} 行{{ result.truncated ? '（已截断）' : '' }}</span>
    </div>

    <el-alert v-if="!auth.hasCap('RAW_SQL')" type="warning" :closable="false" title="当前账号没有自定义 SQL 权限" style="margin-bottom: 12px" />

    <SqlEditor v-model="sql" height="220px" :readonly="!auth.hasCap('RAW_SQL')" />
    <div class="hint muted">支持 SELECT / SHOW / DESC 等只读语句；DDL 请在建表页或沙盒库中操作，DML 一律被拒绝。</div>

    <div class="card-block result-card" v-if="result">
      <div class="toolbar">
        <el-tag size="small">{{ result.type }}</el-tag>
        <el-tag size="small" type="info">{{ result.statementType }}</el-tag>
        <span v-if="result.message" class="muted">{{ result.message }}</span>
      </div>
      <div style="overflow: auto; max-height: 480px" v-if="result.columns && result.columns.length">
        <table class="result-table">
          <thead><tr><th v-for="c in result.columns" :key="c">{{ c }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in result.rows" :key="i">
              <td v-for="(cell, j) in row" :key="j">{{ cell === null ? 'NULL' : cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <el-empty v-else description="执行完成，无结果集" :image-size="60" />
    </div>

    <div class="card-block history" v-if="history.length">
      <div class="muted" style="margin-bottom: 8px">最近执行</div>
      <div v-for="(item, i) in history" :key="i" class="history-item" @click="loadHistory(item)">
        <el-tag size="small" :type="item.ok ? 'success' : 'danger'">{{ item.schema }}</el-tag>
        <span class="mono history-sql">{{ item.sql }}</span>
        <span class="muted">{{ item.time }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SqlEditor from '../components/SqlEditor.vue'
import { sqlApi } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const schema = ref(auth.schemas.includes('employees') ? 'employees' : auth.schemas[0] || 'employees')
const sql = ref('SELECT emp_no, first_name, last_name, hire_date\nFROM employees\nWHERE hire_date >= \'1990-01-01\'\nORDER BY hire_date\nLIMIT 20;')
const running = ref(false)
const result = ref<any>(null)
const history = ref<any[]>([])

async function run() {
  if (!sql.value.trim()) {
    ElMessage.warning('请输入 SQL')
    return
  }
  running.value = true
  try {
    result.value = await sqlApi.execute(schema.value, sql.value)
    history.value.unshift({ schema: schema.value, sql: sql.value, ok: true, time: new Date().toLocaleTimeString() })
    history.value = history.value.slice(0, 10)
  } catch (e: any) {
    result.value = null
    history.value.unshift({ schema: schema.value, sql: sql.value, ok: false, time: new Date().toLocaleTimeString() })
    history.value = history.value.slice(0, 10)
  } finally {
    running.value = false
  }
}

function loadHistory(item: any) {
  sql.value = item.sql
  schema.value = item.schema
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    run()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.hint {
  margin: 8px 0 16px;
}
.result-card {
  margin-top: 16px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  border-bottom: 1px dashed #ebeef5;
}
.history-sql {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.history {
  margin-top: 16px;
}
</style>
