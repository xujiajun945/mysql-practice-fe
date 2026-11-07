<template>
  <div v-if="detail">
    <div class="toolbar">
      <el-button @click="router.push('/admin/reviews')">← 返回队列</el-button>
      <div class="page-title" style="margin: 0">答卷 #{{ detail.attemptId }}</div>
      <el-tag size="small" :type="detail.status === 'REVIEWED' ? 'success' : 'primary'">{{ detail.status }}</el-tag>
      <span class="muted">用户：{{ detail.username }}（{{ detail.nickname }}）</span>
      <span class="muted">提交时间：{{ detail.submittedAt }}</span>
      <span v-if="detail.score !== null" class="muted">得分：{{ detail.score }}</span>
    </div>

    <div v-for="(q, index) in detail.questions" :key="q.id" class="answer-box">
      <div class="answer-head">
        <div>
          <el-tag size="small" style="margin-right: 8px">{{ q.difficulty }}</el-tag>
          <span class="question-title">第 {{ index + 1 }} 题：{{ q.title }}</span>
        </div>
        <el-tag size="small" :type="q.answer?.autoResult === 'PASS' ? 'success' : 'warning'">
          自动判题：{{ q.answer?.autoResult || '未作答' }}
        </el-tag>
      </div>
      <div class="description">{{ q.description }}</div>

      <div class="section-label">学生 SQL</div>
      <pre class="sql-code">{{ q.answer?.userSql || '（未作答）' }}</pre>

      <div class="section-label">参考答案</div>
      <pre class="sql-code">{{ q.answer?.referenceSql }}</pre>

      <el-collapse style="margin-top: 8px">
        <el-collapse-item title="对比结果集（期望 / 学生）">
          <div class="compare">
            <div class="compare-col">
              <div class="muted">期望结果（{{ (q.answer?.expectedRows || []).length }} 行）</div>
              <div style="overflow: auto; max-height: 260px">
                <table class="result-table">
                  <thead><tr><th v-for="c in q.answer?.expectedColumns || []" :key="c">{{ c }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in q.answer?.expectedRows || []" :key="i">
                      <td v-for="(cell, j) in row" :key="j">{{ cell === null ? 'NULL' : cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="compare-col">
              <div class="muted">学生结果（{{ (q.answer?.userRows || []).length }} 行）</div>
              <div style="overflow: auto; max-height: 260px">
                <table class="result-table">
                  <thead><tr><th v-for="c in q.answer?.userColumns || []" :key="c">{{ c }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in q.answer?.userRows || []" :key="i">
                      <td v-for="(cell, j) in row" :key="j">{{ cell === null ? 'NULL' : cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div class="review-line">
        <el-switch v-model="judgements[q.id].correct" active-text="判定正确" inactive-text="判定错误" />
        <el-input v-model="judgements[q.id].comment" placeholder="批阅意见（可选）" style="flex: 1" />
        <el-button size="small" type="primary" :disabled="detail.status === 'REVIEWED'" @click="saveJudgement(q)">保存判定</el-button>
        <el-tag v-if="q.answer?.correct !== null && q.answer?.correct !== undefined" size="small" :type="q.answer.correct === 1 ? 'success' : 'danger'">
          当前：{{ q.answer.correct === 1 ? '正确' : '错误' }}
        </el-tag>
      </div>
    </div>

    <div class="card-block" style="margin-top: 16px">
      <div class="section-label">总评</div>
      <el-input v-model="overallComment" type="textarea" :rows="3" :disabled="detail.status === 'REVIEWED'" placeholder="给学生的整体点评" />
      <div class="toolbar" style="margin-top: 12px">
        <span class="muted">批阅完成后学生端将解锁参考答案与解析。</span>
        <div style="flex: 1"></div>
        <el-button type="primary" :disabled="detail.status === 'REVIEWED'" :loading="completing" @click="complete">完成批阅</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../api'

const route = useRoute()
const router = useRouter()
const attemptId = Number(route.params.attemptId)
const detail = ref<any>(null)
const judgements = reactive<Record<number, { correct: boolean; comment: string }>>({})
const overallComment = ref('')
const completing = ref(false)

async function load() {
  detail.value = await adminApi.reviewDetail(attemptId)
  for (const q of detail.value.questions) {
    judgements[q.id] = {
      correct: q.answer?.correct === 1 || q.answer?.autoResult === 'PASS',
      comment: q.answer?.reviewComment || ''
    }
  }
  overallComment.value = detail.value.overallComment || ''
}

async function saveJudgement(q: any) {
  if (!q.answer?.id) {
    ElMessage.warning('该题没有作答记录')
    return
  }
  await adminApi.reviewAnswer(attemptId, q.answer.id, judgements[q.id].correct, judgements[q.id].comment)
  q.answer.correct = judgements[q.id].correct ? 1 : 0
  q.answer.reviewComment = judgements[q.id].comment
  ElMessage.success('已保存该题判定')
}

async function complete() {
  try {
    await ElMessageBox.confirm('完成后学生即可看到参考答案与解析，确定完成批阅？', '确认', { type: 'warning' })
    completing.value = true
    detail.value = await adminApi.completeReview(attemptId, overallComment.value)
    ElMessage.success('批阅完成')
  } catch (e) {
  } finally {
    completing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.question-title {
  font-weight: 600;
}
.description {
  white-space: pre-wrap;
  margin: 8px 0;
}
.section-label {
  font-weight: 600;
  margin: 8px 0 6px;
}
.review-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.compare {
  display: flex;
  gap: 12px;
}
.compare-col {
  flex: 1;
  min-width: 0;
}
</style>
