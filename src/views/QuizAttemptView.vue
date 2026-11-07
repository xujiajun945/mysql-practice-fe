<template>
  <div v-if="attempt">
    <div class="toolbar">
      <el-button @click="router.push('/quiz')">← 返回</el-button>
      <div class="page-title" style="margin: 0">第 {{ attempt.id }} 轮练习</div>
      <el-tag :type="attempt.status === 'REVIEWED' ? 'success' : attempt.status === 'PENDING_REVIEW' ? 'primary' : 'warning'">
        {{ statusText(attempt.status) }}
      </el-tag>
      <span class="muted">已答 {{ attempt.answered }}/{{ attempt.total }}</span>
      <span v-if="attempt.score !== null && attempt.score !== undefined" class="muted">得分：{{ attempt.score }}</span>
      <div style="flex: 1"></div>
      <el-button v-if="attempt.status === 'ANSWERING'" type="primary" :loading="submitting" @click="submitAttempt">提交本轮</el-button>
    </div>

    <el-alert v-if="attempt.status === 'PENDING_REVIEW'" type="info" :closable="false" style="margin-bottom: 12px"
      title="已提交，等待管理员批阅。批阅完成后将解锁参考答案与解析。" />
    <el-alert v-if="attempt.status === 'REVIEWED'" type="success" :closable="false" style="margin-bottom: 12px"
      :title="`批阅完成，得分 ${attempt.score ?? 0}${attempt.overallComment ? '：' + attempt.overallComment : ''}`" />

    <div v-if="auth.canSeeSchema('employees')" class="card-block ref-panel">
      <div class="ref-head">
        <span class="ref-title">employees 表结构参考</span>
        <span class="muted">可同时对照多张表</span>
        <div style="flex: 1"></div>
        <el-select
          v-model="pendingTable"
          size="small"
          placeholder="添加表结构"
          style="width: 150px"
          :disabled="!remainingTables.length"
          @change="addTable"
        >
          <el-option v-for="t in remainingTables" :key="t.name" :label="t.name" :value="t.name" />
        </el-select>
        <el-button text size="small" :disabled="!remainingTables.length" @click="addAllTables">全部添加</el-button>
        <el-button text size="small" @click="refVisible = !refVisible">{{ refVisible ? '收起' : '展开' }}</el-button>
      </div>
      <div v-show="refVisible" v-loading="refLoading" class="ref-body">
        <div v-if="!refLoading && !shownTables.length" class="ref-empty muted">
          还没有添加表结构，用上方「添加表结构」下拉框选择需要的表。
        </div>
        <div class="ref-grid">
          <div v-for="t in shownTables" :key="t.name" class="ref-card">
            <div class="ref-card-head">
              <span class="mono ref-name">{{ t.name }}</span>
              <span class="muted ref-meta-inline">约 {{ t.rowCount ?? 0 }} 行 · {{ t.columns.length }} 个字段</span>
              <div style="flex: 1"></div>
              <el-button text size="small" @click="removeTable(t.name)">移除</el-button>
            </div>
            <div class="ref-table-wrap">
              <table class="result-table">
                <thead>
                  <tr><th>字段</th><th>类型</th><th>可空</th><th>键</th><th>默认值</th><th>备注</th></tr>
                </thead>
                <tbody>
                  <tr v-for="c in t.columns" :key="c.name">
                    <td class="mono">{{ c.name }}</td>
                    <td>{{ c.type }}</td>
                    <td>{{ c.nullable === 'YES' ? '是' : '否' }}</td>
                    <td>{{ c.key }}</td>
                    <td>{{ c.defaultValue ?? '' }}</td>
                    <td>{{ c.comment }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <el-empty v-if="!refLoading && !refTables.length" description="暂无表结构信息" :image-size="50" />
      </div>
    </div>

    <div v-if="auth.canSeeSchema('employees')" class="card-block ref-panel">
      <div class="ref-head">
        <span class="ref-title">employees 索引参考</span>
        <span class="muted">每张表的主键与索引定义</span>
        <div style="flex: 1"></div>
        <el-select
          v-model="pendingIdxTable"
          size="small"
          placeholder="添加表索引"
          style="width: 150px"
          :disabled="!remainingIdxTables.length"
          @change="addIdxTable"
        >
          <el-option v-for="t in remainingIdxTables" :key="t.name" :label="t.name" :value="t.name" />
        </el-select>
        <el-button text size="small" :disabled="!remainingIdxTables.length" @click="addAllIdxTables">全部添加</el-button>
        <el-button text size="small" @click="idxVisible = !idxVisible">{{ idxVisible ? '收起' : '展开' }}</el-button>
      </div>
      <div v-show="idxVisible" v-loading="refLoading" class="ref-body">
        <div v-if="!refLoading && !shownIdxTables.length" class="ref-empty muted">
          还没有添加表索引，用上方「添加表索引」下拉框选择需要的表。
        </div>
        <div class="ref-grid">
          <div v-for="t in shownIdxTables" :key="t.name" class="ref-card">
            <div class="ref-card-head">
              <span class="mono ref-name">{{ t.name }}</span>
              <span class="muted ref-meta-inline">约 {{ t.rowCount ?? 0 }} 行 · {{ t.indexes.length }} 个索引</span>
              <div style="flex: 1"></div>
              <el-button text size="small" @click="removeIdxTable(t.name)">移除</el-button>
            </div>
            <div v-if="t.indexes.length" class="ref-table-wrap">
              <table class="result-table">
                <thead>
                  <tr><th>索引名</th><th>唯一</th><th>字段</th><th>类型</th></tr>
                </thead>
                <tbody>
                  <tr v-for="i in t.indexes" :key="i.name">
                    <td class="mono">{{ i.name }}</td>
                    <td>{{ i.unique ? '是' : '否' }}</td>
                    <td class="mono">{{ i.columns.join(', ') }}</td>
                    <td>{{ i.type }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="ref-empty muted">该表没有索引</div>
          </div>
        </div>
      </div>
    </div>

    <div v-for="(q, index) in attempt.questions" :key="q.id" class="answer-box">
      <div class="answer-head">
        <div>
          <el-tag size="small" :type="difficultyType(q.difficulty)" style="margin-right: 8px">第 {{ index + 1 }} 题 · {{ q.difficulty }}</el-tag>
          <span class="question-title">{{ q.title }}</span>
        </div>
        <el-tag v-if="q.answer && q.answer.autoResult" size="small" :type="autoType(q.answer.autoResult)">
          自动判题：{{ autoText(q.answer.autoResult) }}
        </el-tag>
      </div>
      <div class="description">{{ q.description }}</div>
      <div v-if="q.tags" class="muted" style="margin: 6px 0">标签：{{ q.tags }}</div>

      <div class="answer-split">
        <div class="answer-left">
          <SqlEditor v-model="drafts[q.id]" height="200px" :readonly="attempt.status !== 'ANSWERING'" />
          <div class="toolbar" style="margin-top: 8px">
            <el-button type="primary" size="small" :disabled="attempt.status !== 'ANSWERING'" :loading="savingId === q.id" @click="submitAnswer(q)">提交本题</el-button>
            <el-button size="small" :disabled="attempt.status !== 'ANSWERING'" :loading="testingId === q.id" @click="testAnswer(q)">测试</el-button>
            <span v-if="q.answer" class="muted">耗时 {{ q.answer.elapsedMs ?? 0 }} ms</span>
          </div>
          <div v-if="q.answer && q.answer.autoMessage" class="muted auto-msg">{{ q.answer.autoMessage }}</div>
        </div>
        <div class="answer-right">
          <div class="test-head">
            <span class="test-title">执行结果</span>
            <div style="flex: 1"></div>
            <el-tag v-if="testResults[q.id] && testResults[q.id].ok" size="small" type="info">
              {{ testResults[q.id].rowCount }} 行 · {{ testResults[q.id].elapsedMs }} ms
            </el-tag>
            <el-tag v-if="testResults[q.id] && testResults[q.id].truncated" size="small" type="warning">结果已截断</el-tag>
          </div>
          <div v-if="!testResults[q.id]" class="test-empty muted">
            {{ attempt.status === 'ANSWERING' ? '点「测试」在此查看执行结果，测试不会提交、不影响判题' : '本轮已提交，无法再测试' }}
          </div>
          <template v-else>
            <div v-if="!testResults[q.id].ok" class="test-error">{{ testResults[q.id].message }}</div>
            <template v-else>
              <div class="test-msg muted">{{ testResults[q.id].message }}</div>
              <div class="test-table-wrap">
                <table v-if="testResults[q.id].rows && testResults[q.id].rows.length" class="result-table">
                  <thead>
                    <tr><th v-for="c in testResults[q.id].columns" :key="c">{{ c }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, ri) in testResults[q.id].rows" :key="ri">
                      <td v-for="(cell, ci) in r" :key="ci" class="mono">{{ cell === null ? 'NULL' : cell }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="muted test-empty">查询无结果行</div>
              </div>
            </template>
          </template>
        </div>
      </div>

      <template v-if="attempt.status === 'REVIEWED'">
        <el-divider content-position="left">批阅结果</el-divider>
        <div class="toolbar">
          <el-tag :type="q.answer && q.answer.correct === 1 ? 'success' : 'danger'" size="small">
            {{ q.answer && q.answer.correct === 1 ? '正确' : '错误' }}
          </el-tag>
          <span v-if="q.answer && q.answer.reviewComment" class="muted">{{ q.answer.reviewComment }}</span>
        </div>
        <div style="margin-top: 8px">
          <div class="section-label">参考答案</div>
          <pre class="sql-code">{{ q.answer?.referenceSql || '（无参考答案）' }}</pre>
        </div>
        <div style="margin-top: 8px">
          <div class="section-label">解析</div>
          <div class="explanation">{{ q.answer?.explanation || '（无解析）' }}</div>
        </div>
        <el-collapse v-if="q.answer?.expectedColumns?.length">
          <el-collapse-item title="查看期望结果集">
            <div style="overflow: auto; max-height: 300px">
              <table class="result-table">
                <thead><tr><th v-for="c in q.answer.expectedColumns" :key="c">{{ c }}</th></tr></thead>
                <tbody>
                  <tr v-for="(row, i) in q.answer.expectedRows" :key="i">
                    <td v-for="(cell, j) in row" :key="j">{{ cell === null ? 'NULL' : cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </el-collapse-item>
        </el-collapse>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SqlEditor from '../components/SqlEditor.vue'
import { quizApi, metaApi } from '../api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const attemptId = Number(route.params.id)

const attempt = ref<any>(null)
const drafts = reactive<Record<number, string>>({})
const savingId = ref<number | null>(null)
const testingId = ref<number | null>(null)
const testResults = reactive<Record<number, any>>({})
const submitting = ref(false)
const refTables = ref<any[]>([])
const refLoading = ref(false)
const refVisible = ref(true)
const pendingTable = ref('')
const shownNames = ref<string[]>(['employees'])
const refInited = ref(false)
const idxVisible = ref(false)
const pendingIdxTable = ref('')
const idxShownNames = ref<string[]>([])
const idxInited = ref(false)

const shownTables = computed(() => refTables.value.filter((t: any) => shownNames.value.includes(t.name)))
const remainingTables = computed(() => refTables.value.filter((t: any) => !shownNames.value.includes(t.name)))

function addTable(name: string) {
  if (name && !shownNames.value.includes(name)) shownNames.value.push(name)
  pendingTable.value = ''
}

function addAllTables() {
  shownNames.value = refTables.value.map((t: any) => t.name)
  pendingTable.value = ''
}

function removeTable(name: string) {
  shownNames.value = shownNames.value.filter((n: string) => n !== name)
}

const shownIdxTables = computed(() => refTables.value.filter((t: any) => idxShownNames.value.includes(t.name)))
const remainingIdxTables = computed(() => refTables.value.filter((t: any) => !idxShownNames.value.includes(t.name)))

function addIdxTable(name: string) {
  if (name && !idxShownNames.value.includes(name)) idxShownNames.value.push(name)
  pendingIdxTable.value = ''
}

function addAllIdxTables() {
  idxShownNames.value = refTables.value.map((t: any) => t.name)
  pendingIdxTable.value = ''
}

function removeIdxTable(name: string) {
  idxShownNames.value = idxShownNames.value.filter((n: string) => n !== name)
}

async function loadRef() {
  if (!auth.canSeeSchema('employees')) return
  refLoading.value = true
  try {
    const tables = await metaApi.tables('employees')
    const details = await Promise.all(tables.map((t: any) => metaApi.detail('employees', t.name)))
    refTables.value = tables.map((t: any, index: number) => ({
      name: t.name,
      rowCount: details[index]?.rowCount ?? t.rowCount,
      columns: details[index]?.columns || [],
      indexes: details[index]?.indexes || []
    }))
    if (!refInited.value && refTables.value.length) {
      shownNames.value = refTables.value.map((t: any) => t.name)
      refInited.value = true
    }
    if (!idxInited.value && refTables.value.length) {
      idxShownNames.value = refTables.value.map((t: any) => t.name)
      idxInited.value = true
    }
  } catch (e) {
    refTables.value = []
  } finally {
    refLoading.value = false
  }
}

function statusText(status: string) {
  return status === 'ANSWERING' ? '作答中' : status === 'PENDING_REVIEW' ? '待批阅' : status === 'REVIEWED' ? '已批阅' : status
}
function difficultyType(d: string) {
  return d === 'EASY' ? 'success' : d === 'MEDIUM' ? 'warning' : 'danger'
}
function autoText(r: string) {
  return { PASS: '通过', WRONG_ANSWER: '结果不符', TIMEOUT: '超时', RUNTIME_ERROR: '执行报错', NOT_SELECT: '非查询语句' }[r] || r
}
function autoType(r: string) {
  return r === 'PASS' ? 'success' : r === 'WRONG_ANSWER' ? 'warning' : 'danger'
}

async function load() {
  attempt.value = await quizApi.attempt(attemptId)
  for (const q of attempt.value.questions) {
    drafts[q.id] = q.answer?.userSql || ''
  }
}

async function submitAnswer(q: any) {
  const sql = (drafts[q.id] || '').trim()
  if (!sql) {
    ElMessage.warning('请先输入 SQL')
    return
  }
  savingId.value = q.id
  try {
    const answer = await quizApi.submitAnswer(attemptId, q.id, sql)
    const target = attempt.value.questions.find((item: any) => item.id === q.id)
    if (target) target.answer = { ...(target.answer || {}), ...answer }
    attempt.value.answered = attempt.value.questions.filter((item: any) => item.answer?.autoResult).length
    ElMessage[answer.autoResult === 'PASS' ? 'success' : 'warning'](answer.autoMessage || autoText(answer.autoResult))
  } finally {
    savingId.value = null
  }
}

async function testAnswer(q: any) {
  const sql = (drafts[q.id] || '').trim()
  if (!sql) {
    ElMessage.warning('请先输入 SQL')
    return
  }
  testingId.value = q.id
  try {
    testResults[q.id] = await quizApi.testAnswer(attemptId, q.id, sql)
  } catch (e) {
    // 接口层已统一提示
  } finally {
    testingId.value = null
  }
}

async function submitAttempt() {
  const unanswered = attempt.value.questions.filter((q: any) => !q.answer?.autoResult).length
  const message = unanswered > 0 ? `还有 ${unanswered} 题未提交，确定提交本轮吗？` : '确定提交本轮练习吗？提交后等待管理员批阅。'
  try {
    await ElMessageBox.confirm(message, '提交确认', { type: 'warning' })
  } catch (e) {
    return
  }
  submitting.value = true
  try {
    await quizApi.submitAttempt(attemptId)
    ElMessage.success('已提交，等待批阅')
    await load()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  load()
  loadRef()
})
</script>

<style scoped>
.question-title {
  font-weight: 600;
}
.description {
  white-space: pre-wrap;
  line-height: 1.7;
  color: #303133;
}
.section-label {
  font-weight: 600;
  margin-bottom: 6px;
}
.explanation {
  white-space: pre-wrap;
  line-height: 1.7;
  background: #fafafa;
  border-radius: 6px;
  padding: 10px;
  color: #606266;
}
.ref-panel {
  margin-bottom: 16px;
  padding: 12px 16px;
}
.ref-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ref-title {
  font-weight: 600;
}
.ref-body {
  margin-top: 10px;
  max-height: 460px;
  overflow: auto;
}
.ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 12px;
  align-items: start;
}
.ref-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px 10px 10px;
  background: #fff;
}
.ref-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.ref-name {
  font-weight: 600;
}
.ref-meta-inline {
  font-size: 12px;
}
.ref-table-wrap {
  max-height: 200px;
  overflow: auto;
}
.ref-empty {
  padding: 8px 0;
  font-size: 13px;
}
.answer-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  margin-top: 8px;
}
.answer-left {
  min-width: 0;
}
.answer-right {
  min-width: 0;
  min-height: 200px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fcfcfc;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
}
.test-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.test-title {
  font-weight: 600;
  font-size: 13px;
}
.test-empty {
  padding: 6px 0;
  font-size: 13px;
}
.test-error {
  color: #f56c6c;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}
.test-msg {
  font-size: 12px;
  margin-bottom: 6px;
}
.test-table-wrap {
  max-height: 220px;
  overflow: auto;
}
.auto-msg {
  font-size: 12px;
  margin-top: 6px;
  white-space: pre-wrap;
}
@media (max-width: 900px) {
  .answer-split {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .ref-grid {
    grid-template-columns: 1fr;
  }
  .ref-head {
    flex-wrap: wrap;
  }
  .ref-head :deep(.el-select) {
    width: 100% !important;
  }
  .ref-body {
    max-height: 320px;
  }
  .ref-table-wrap {
    max-height: 180px;
  }
}</style>
