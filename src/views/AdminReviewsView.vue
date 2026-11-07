<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">答题批阅</div>
      <el-select v-model="status" style="width: 170px" @change="load">
        <el-option label="待批阅" value="PENDING_REVIEW" />
        <el-option label="已批阅" value="REVIEWED" />
        <el-option label="作答中" value="ANSWERING" />
      </el-select>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-table :data="items" v-loading="loading" size="small">
      <el-table-column prop="attemptId" label="答题号" width="90" />
      <el-table-column prop="username" label="用户" width="130" />
      <el-table-column prop="nickname" label="昵称" width="130" />
      <el-table-column label="进度" width="100">
        <template #default="scope">{{ scope.row.answered }}/{{ scope.row.total }}</template>
      </el-table-column>
      <el-table-column prop="autoPass" label="自动通过" width="100" />
      <el-table-column prop="score" label="得分" width="80" />
      <el-table-column prop="submittedAt" label="提交时间" min-width="180" />
      <el-table-column label="操作" width="120">
        <template #default="scope">
          <el-button text type="primary" @click="$router.push(`/admin/reviews/${scope.row.attemptId}`)">
            {{ scope.row.status === 'REVIEWED' ? '查看' : '批阅' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !items.length" :description="status === 'PENDING_REVIEW' ? '暂无待批阅的答卷' : '暂无记录'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi } from '../api'

const items = ref<any[]>([])
const status = ref('PENDING_REVIEW')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    items.value = await adminApi.reviewQueue(status.value)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
