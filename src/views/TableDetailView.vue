<template>
  <div>
    <div class="toolbar">
      <el-button @click="router.push('/tables')">← 返回表列表</el-button>
      <h2 class="title">{{ schema }}.{{ table }}</h2>
      <el-tag v-if="detail" size="small">{{ detail.rowCount ?? 0 }} 行</el-tag>
      <el-tag v-if="detail" size="small" type="info">{{ detail.sizeKb ?? 0 }} KB</el-tag>
      <div style="flex: 1"></div>
      <template v-if="ddlAllowed">
        <el-button v-if="auth.hasCap('ALTER_COLUMN')" @click="openAddColumn">加字段</el-button>
        <el-button v-if="auth.hasCap('ALTER_COLUMN')" @click="openDropColumn">删字段</el-button>
        <el-button v-if="auth.hasCap('INDEX')" @click="openAddIndex">加索引</el-button>
        <el-button v-if="auth.hasCap('INDEX')" @click="openDropIndex">删索引</el-button>
        <el-button v-if="auth.hasCap('DROP_TABLE')" type="danger" @click="openDropTable">删表</el-button>
      </template>
      <el-tooltip v-else content="该 schema 为只读示例库，DDL 仅在 practice / employees_lab 开放">
        <el-tag type="warning">只读</el-tag>
      </el-tooltip>
    </div>

    <el-tabs v-model="tab" class="card-block">
      <el-tab-pane label="字段信息" name="columns">
        <el-table :data="detail?.columns || []" size="small" border>
          <el-table-column prop="name" label="字段名" width="170" />
          <el-table-column prop="type" label="类型" min-width="150" />
          <el-table-column prop="nullable" label="可空" width="70" />
          <el-table-column prop="key" label="键" width="90" />
          <el-table-column prop="defaultValue" label="默认值" min-width="120" />
          <el-table-column prop="extra" label="额外" min-width="130" />
          <el-table-column prop="comment" label="备注" min-width="160" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="索引" name="indexes">
        <el-table :data="detail?.indexes || []" size="small" border>
          <el-table-column prop="name" label="索引名" width="180" />
          <el-table-column prop="unique" label="唯一" width="80">
            <template #default="scope">{{ scope.row.unique ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column label="字段">
            <template #default="scope">{{ (scope.row.columns || []).join(', ') }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="建表语句" name="ddl">
        <pre class="sql-code">{{ detail?.createSql }}</pre>
      </el-tab-pane>

      <el-tab-pane label="数据预览" name="preview">
        <div class="toolbar">
          <el-radio-group v-model="previewLimit" size="small" @change="loadPreview">
            <el-radio-button :value="20">20 行</el-radio-button>
            <el-radio-button :value="50">50 行</el-radio-button>
            <el-radio-button :value="100">100 行</el-radio-button>
          </el-radio-group>
          <span class="muted">耗时 {{ preview.elapsedMs }} ms，共 {{ preview.rowCount }} 行{{ preview.truncated ? '（已截断）' : '' }}</span>
        </div>
        <div style="overflow: auto; max-height: 520px">
          <table class="result-table" v-if="preview.columns.length">
            <thead><tr><th v-for="c in preview.columns" :key="c">{{ c }}</th></tr></thead>
            <tbody>
              <tr v-for="(row, i) in preview.rows" :key="i">
                <td v-for="(cell, j) in row" :key="j">{{ cell === null ? 'NULL' : cell }}</td>
              </tr>
            </tbody>
          </table>
          <el-empty v-else description="暂无数据" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 删表 -->
    <el-dialog v-model="dropTableVisible" title="删除表" width="520px">
      <el-alert type="error" :closable="false" title="删除后不可恢复，请谨慎操作" style="margin-bottom: 12px" />
      <el-form label-width="110px">
        <el-form-item label="再次输入表名">
          <el-input v-model="confirmName" :placeholder="table" />
        </el-form-item>
      </el-form>
      <pre v-if="ddlPreview" class="sql-code">{{ ddlPreview }}</pre>
      <template #footer>
        <el-button @click="dropTableVisible = false">取消</el-button>
        <el-button @click="previewDropTable">预览</el-button>
        <el-button type="danger" :disabled="confirmName !== table" @click="executeDropTable">确认删除</el-button>
      </template>
    </el-dialog>

    <!-- 加字段 -->
    <el-dialog v-model="addColumnVisible" title="新增字段" width="720px">
      <el-form label-width="100px">
        <el-row :gutter="12">
          <el-col :xs="24" :sm="8"><el-form-item label="字段名"><el-input v-model="columnForm.name" /></el-form-item></el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="类型">
              <el-select v-model="columnForm.type" style="width: 100%">
                <el-option v-for="t in types" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8"><el-form-item label="长度"><el-input-number v-model="columnForm.length" :min="1" controls-position="right" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :xs="24" :sm="8">
            <el-form-item label="默认值类型">
              <el-select v-model="columnForm.defaultType" style="width: 100%">
                <el-option label="无默认" value="NONE" />
                <el-option label="NULL" value="NULL" />
                <el-option label="字面量" value="LITERAL" />
                <el-option label="CURRENT_TIMESTAMP" value="CURRENT_TIMESTAMP" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8"><el-form-item label="默认值"><el-input v-model="columnForm.defaultValue" :disabled="columnForm.defaultType !== 'LITERAL'" /></el-form-item></el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="位置">
              <el-select v-model="columnForm.position" style="width: 100%">
                <el-option label="末尾" value="END" />
                <el-option label="最前" value="FIRST" />
                <el-option label="指定字段之后" value="AFTER" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :xs="24" :sm="8">
            <el-form-item v-if="columnForm.position === 'AFTER'" label="在谁之后">
              <el-select v-model="columnForm.afterColumn" style="width: 100%">
                <el-option v-for="c in detail?.columns || []" :key="c.name" :label="c.name" :value="c.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="16">
            <el-form-item label="约束">
              <el-checkbox v-model="columnForm.nullable">可空</el-checkbox>
              <el-checkbox v-model="columnForm.primaryKey">主键</el-checkbox>
              <el-checkbox v-model="columnForm.unique">唯一</el-checkbox>
              <el-checkbox v-model="columnForm.autoIncrement">自增</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="columnForm.comment" /></el-form-item>
      </el-form>
      <pre v-if="ddlPreview" class="sql-code">{{ ddlPreview }}</pre>
      <template #footer>
        <el-button @click="addColumnVisible = false">取消</el-button>
        <el-button @click="previewAddColumn">预览</el-button>
        <el-button type="primary" @click="executeAddColumn">执行</el-button>
      </template>
    </el-dialog>

    <!-- 删字段 -->
    <el-dialog v-model="dropColumnVisible" title="删除字段" width="520px">
      <el-select v-model="dropColumnName" placeholder="选择要删除的字段" style="width: 100%">
        <el-option v-for="c in detail?.columns || []" :key="c.name" :label="c.name" :value="c.name" />
      </el-select>
      <pre v-if="ddlPreview" class="sql-code" style="margin-top: 12px">{{ ddlPreview }}</pre>
      <template #footer>
        <el-button @click="dropColumnVisible = false">取消</el-button>
        <el-button @click="previewDropColumn">预览</el-button>
        <el-button type="danger" @click="executeDropColumn">确认删除</el-button>
      </template>
    </el-dialog>

    <!-- 加索引 -->
    <el-dialog v-model="addIndexVisible" title="新增索引" width="620px">
      <el-form label-width="100px">
        <el-form-item label="索引名"><el-input v-model="indexForm.name" placeholder="如 idx_name" /></el-form-item>
        <el-form-item label="字段">
          <el-select v-model="indexForm.columns" multiple style="width: 100%">
            <el-option v-for="c in detail?.columns || []" :key="c.name" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="唯一索引"><el-switch v-model="indexForm.unique" /></el-form-item>
      </el-form>
      <pre v-if="ddlPreview" class="sql-code">{{ ddlPreview }}</pre>
      <template #footer>
        <el-button @click="addIndexVisible = false">取消</el-button>
        <el-button @click="previewAddIndex">预览</el-button>
        <el-button type="primary" @click="executeAddIndex">执行</el-button>
      </template>
    </el-dialog>

    <!-- 删索引 -->
    <el-dialog v-model="dropIndexVisible" title="删除索引" width="520px">
      <el-select v-model="dropIndexName" placeholder="选择索引" style="width: 100%">
        <el-option v-for="i in detail?.indexes || []" :key="i.name" :label="i.name" :value="i.name" :disabled="i.name === 'PRIMARY'" />
      </el-select>
      <pre v-if="ddlPreview" class="sql-code" style="margin-top: 12px">{{ ddlPreview }}</pre>
      <template #footer>
        <el-button @click="dropIndexVisible = false">取消</el-button>
        <el-button @click="previewDropIndex">预览</el-button>
        <el-button type="danger" @click="executeDropIndex">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { metaApi, ddlApi } from '../api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const schema = route.params.schema as string
const table = route.params.table as string

const types = ['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'float', 'double', 'varchar', 'char', 'text', 'longtext', 'date', 'datetime', 'timestamp', 'time', 'json', 'blob']

const detail = ref<any>(null)
const tab = ref('columns')
const previewLimit = ref(20)
const preview = ref<any>({ columns: [], rows: [], elapsedMs: 0, rowCount: 0, truncated: false })
const ddlAllowed = ['practice', 'employees_lab'].includes(schema)

const ddlPreview = ref('')

const dropTableVisible = ref(false)
const confirmName = ref('')
const addColumnVisible = ref(false)
const dropColumnVisible = ref(false)
const dropColumnName = ref('')
const addIndexVisible = ref(false)
const dropIndexVisible = ref(false)
const dropIndexName = ref('')

const columnForm = reactive<any>({ name: '', type: 'int', length: null, defaultType: 'NONE', defaultValue: '', nullable: true, primaryKey: false, unique: false, autoIncrement: false, comment: '', position: 'END', afterColumn: '' })
const indexForm = reactive<any>({ name: '', columns: [], unique: false })

async function load() {
  detail.value = await metaApi.detail(schema, table)
  await loadPreview()
}

async function loadPreview() {
  preview.value = await metaApi.preview(schema, table, previewLimit.value)
}

function openDropTable() {
  confirmName.value = ''
  ddlPreview.value = ''
  dropTableVisible.value = true
}
function openAddColumn() {
  Object.assign(columnForm, { name: '', type: 'int', length: null, defaultType: 'NONE', defaultValue: '', nullable: true, primaryKey: false, unique: false, autoIncrement: false, comment: '', position: 'END', afterColumn: '' })
  ddlPreview.value = ''
  addColumnVisible.value = true
}
function openDropColumn() {
  dropColumnName.value = ''
  ddlPreview.value = ''
  dropColumnVisible.value = true
}
function openAddIndex() {
  Object.assign(indexForm, { name: '', columns: [], unique: false })
  ddlPreview.value = ''
  addIndexVisible.value = true
}
function openDropIndex() {
  dropIndexName.value = ''
  ddlPreview.value = ''
  dropIndexVisible.value = true
}

function columnPayload() {
  return {
    name: columnForm.name,
    type: columnForm.type,
    length: columnForm.length || null,
    defaultType: columnForm.defaultType,
    defaultValue: columnForm.defaultValue,
    nullable: columnForm.nullable,
    primaryKey: columnForm.primaryKey,
    unique: columnForm.unique,
    autoIncrement: columnForm.autoIncrement,
    comment: columnForm.comment
  }
}

async function previewDropTable() {
  const data = await ddlApi.previewDrop({ schema, table, confirmName: confirmName.value || table })
  ddlPreview.value = data.sql
}
async function executeDropTable() {
  await ddlApi.drop({ schema, table, confirmName: confirmName.value })
  ElMessage.success('表已删除')
  router.push('/tables')
}
async function previewAddColumn() {
  const data = await ddlApi.previewAddColumn({ schema, table, column: columnPayload(), position: columnForm.position, afterColumn: columnForm.afterColumn })
  ddlPreview.value = data.sql
}
async function executeAddColumn() {
  await ddlApi.addColumn({ schema, table, column: columnPayload(), position: columnForm.position, afterColumn: columnForm.afterColumn })
  ElMessage.success('字段已新增')
  addColumnVisible.value = false
  load()
}
async function previewDropColumn() {
  const data = await ddlApi.previewDropColumn({ schema, table, column: dropColumnName.value })
  ddlPreview.value = data.sql
}
async function executeDropColumn() {
  await ddlApi.dropColumn({ schema, table, column: dropColumnName.value })
  ElMessage.success('字段已删除')
  dropColumnVisible.value = false
  load()
}
async function previewAddIndex() {
  const data = await ddlApi.previewAddIndex({ schema, table, name: indexForm.name, columns: indexForm.columns, unique: indexForm.unique })
  ddlPreview.value = data.sql
}
async function executeAddIndex() {
  await ddlApi.addIndex({ schema, table, name: indexForm.name, columns: indexForm.columns, unique: indexForm.unique })
  ElMessage.success('索引已创建')
  addIndexVisible.value = false
  load()
}
async function previewDropIndex() {
  const data = await ddlApi.previewDropIndex({ schema, table, indexName: dropIndexName.value })
  ddlPreview.value = data.sql
}
async function executeDropIndex() {
  await ddlApi.dropIndex({ schema, table, indexName: dropIndexName.value })
  ElMessage.success('索引已删除')
  dropIndexVisible.value = false
  load()
}

onMounted(load)
</script>

<style scoped>
.title {
  margin: 0;
  font-size: 20px;
}
@media (max-width: 768px) {
  .title {
    font-size: 15px;
    word-break: break-all;
  }
}
</style>
