<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">审计日志</div>
      <el-button @click="load">刷新</el-button>
      <span class="muted">共 {{ total }} 条</span>
    </div>

    <el-table :data="rows" v-loading="loading" size="small">
      <el-table-column prop="createdAt" label="时间" width="180" />
      <el-table-column prop="username" label="用户" width="110" />
      <el-table-column prop="action" label="动作" width="130" />
      <el-table-column prop="schemaName" label="Schema" width="120" />
      <el-table-column prop="tableName" label="表" width="130" />
      <el-table-column label="结果" width="80">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.success ? 'success' : 'danger'">{{ scope.row.success ? '成功' : '失败' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="elapsedMs" label="耗时ms" width="90" />
      <el-table-column label="SQL" min-width="320">
        <template #default="scope">
          <el-tooltip :content="scope.row.sqlText || ''" placement="top" :show-after="300">
            <span class="mono ellipsis">{{ scope.row.sqlText }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="信息" min-width="180" />
      <el-table-column prop="ip" label="IP" width="130" />
    </el-table>

    <div class="toolbar" style="justify-content: flex-end; margin-top: 12px">
      <el-pagination v-model:current-page="page" v-model:page-size="size" :total="total" :page-sizes="[20, 50, 100]"
        layout="sizes, prev, pager, next" @current-change="load" @size-change="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi } from '../api'

const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.audit(page.value, size.value)
    rows.value = data.rows
    total.value = data.total
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
