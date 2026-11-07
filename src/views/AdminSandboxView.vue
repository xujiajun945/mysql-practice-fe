<template>
  <div>
    <div class="page-title">沙盒重置</div>
    <div class="card-block">
      <el-alert type="warning" :closable="false" title="重置会删除并重建 employees_lab（结构与数据从 employees 复制），耗时约数秒，期间请勿操作沙盒库。" />
      <div style="margin-top: 16px">
        <el-button type="danger" :loading="running" @click="reset">重置 employees_lab</el-button>
      </div>
      <div v-if="message" class="result" :class="{ error: failed }">
        {{ message }}
      </div>
      <div class="muted" style="margin-top: 16px">
        说明：practice 库用于自由建表练习，不会被此操作影响；employees 为只读示例库。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { adminApi } from '../api'

const running = ref(false)
const message = ref('')
const failed = ref(false)

async function reset() {
  try {
    await ElMessageBox.confirm('确定重置 employees_lab？该库中的改动将全部丢失。', '确认重置', { type: 'warning' })
  } catch (e) {
    return
  }
  running.value = true
  failed.value = false
  try {
    const data = await adminApi.resetSandbox()
    message.value = `${data.message}（耗时 ${data.elapsedMs} ms）`
  } catch (e: any) {
    failed.value = true
    message.value = '重置失败：' + (e?.message || '未知错误')
  } finally {
    running.value = false
  }
}
</script>

<style scoped>
.result {
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  background: #f0f9eb;
  color: #67c23a;
}
.result.error {
  background: #fef0f0;
  color: #f56c6c;
}
</style>
