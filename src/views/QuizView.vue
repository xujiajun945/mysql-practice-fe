<template>
  <div>
    <div class="toolbar">
      <div class="page-title" style="margin: 0">做题练习</div>
      <el-button type="primary" :loading="starting" @click="start">开始新一轮（随机 5 题）</el-button>
    </div>
    <el-alert type="info" :closable="false" style="margin-bottom: 16px"
      title="每轮固定抽取 5 道题（基础 2 + 进阶 2 + 困难 1）。提交后自动判题，管理员批阅完成后解锁参考答案与解析。" />

    <el-table :data="attempts" v-loading="loading" size="small">
      <el-table-column prop="id" label="#" width="70" />
      <el-table-column label="状态" width="140">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)" size="small">{{ statusText(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="进度" width="110">
        <template #default="scope">{{ scope.row.answered }}/{{ scope.row.total }}</template>
      </el-table-column>
      <el-table-column prop="score" label="得分" width="80" />
      <el-table-column prop="startedAt" label="开始时间" min-width="180" />
      <el-table-column prop="submittedAt" label="提交时间" min-width="180" />
      <el-table-column label="操作" width="110">
        <template #default="scope">
          <el-button text type="primary" @click="$router.push(`/quiz/${scope.row.id}`)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !attempts.length" description="还没有练习记录，点击上方按钮开始" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { quizApi } from '../api'

const router = useRouter()
const attempts = ref<any[]>([])
const loading = ref(false)
const starting = ref(false)

function statusText(status: string) {
  return status === 'ANSWERING' ? '作答中' : status === 'PENDING_REVIEW' ? '待批阅' : status === 'REVIEWED' ? '已批阅' : status
}
function statusType(status: string) {
  return status === 'ANSWERING' ? 'warning' : status === 'PENDING_REVIEW' ? 'primary' : 'success'
}

async function load() {
  loading.value = true
  try {
    attempts.value = await quizApi.myAttempts()
  } finally {
    loading.value = false
  }
}

async function start() {
  starting.value = true
  try {
    const attempt = await quizApi.createAttempt()
    ElMessage.success('已生成 5 道题')
    router.push(`/quiz/${attempt.id}`)
  } finally {
    starting.value = false
  }
}

onMounted(load)
</script>
