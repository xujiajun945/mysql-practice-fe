<template>
  <el-dialog :model-value="modelValue" title="新建表" width="880px" @update:model-value="close" @closed="reset">
    <el-form label-width="90px">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="8">
          <el-form-item label="Schema">
            <el-select v-model="form.schema" placeholder="选择沙盒库" style="width: 100%">
              <el-option v-for="s in ddlSchemas" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-form-item label="表名">
            <el-input v-model="form.table" placeholder="如 student" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-form-item label="表备注">
            <el-input v-model="form.comment" placeholder="可选" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">字段定义</el-divider>
      <div v-for="(col, index) in form.columns" :key="index" class="column-row">
        <el-row :gutter="8">
          <el-col :xs="12" :sm="4"><el-input v-model="col.name" placeholder="字段名" size="small" /></el-col>
          <el-col :xs="12" :sm="4">
            <el-select v-model="col.type" size="small" style="width: 100%">
              <el-option v-for="t in types" :key="t" :label="t" :value="t" />
            </el-select>
          </el-col>
          <el-col :xs="8" :sm="3"><el-input-number v-model="col.length" :min="1" :max="65535" size="small" controls-position="right" placeholder="长度" style="width: 100%" /></el-col>
          <el-col :xs="16" :sm="3">
            <el-select v-model="col.defaultType" size="small" style="width: 100%">
              <el-option label="无默认" value="NONE" />
              <el-option label="NULL" value="NULL" />
              <el-option label="字面量" value="LITERAL" />
              <el-option label="CURRENT_TIMESTAMP" value="CURRENT_TIMESTAMP" />
            </el-select>
          </el-col>
          <el-col :xs="12" :sm="3">
            <el-input v-model="col.defaultValue" size="small" placeholder="默认值" :disabled="col.defaultType !== 'LITERAL'" />
          </el-col>
          <el-col :xs="12" :sm="7">
            <el-checkbox v-model="col.nullable" size="small">可空</el-checkbox>
            <el-checkbox v-model="col.primaryKey" size="small">主键</el-checkbox>
            <el-checkbox v-model="col.unique" size="small">唯一</el-checkbox>
            <el-checkbox v-model="col.autoIncrement" size="small">自增</el-checkbox>
          </el-col>
        </el-row>
        <el-row :gutter="8" class="column-row-second">
          <el-col :xs="18" :sm="20">
            <el-input v-model="col.comment" size="small" placeholder="字段备注（可选）" />
          </el-col>
          <el-col :xs="6" :sm="4">
            <el-button size="small" text type="danger" :disabled="form.columns.length <= 1" @click="removeColumn(index)">删除字段</el-button>
          </el-col>
        </el-row>
      </div>
      <el-button size="small" plain @click="addColumn">+ 添加字段</el-button>

      <template v-if="previewSql">
        <el-divider content-position="left">生成的建表语句</el-divider>
        <pre class="sql-code">{{ previewSql }}</pre>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="close(false)">取消</el-button>
      <el-button :loading="previewing" @click="preview">预览 DDL</el-button>
      <el-button type="primary" :loading="executing" :disabled="!previewSql" @click="execute">确认建表</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ddlApi } from '../api'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'created'])
const auth = useAuthStore()

const types = ['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'float', 'double', 'varchar', 'char', 'text', 'longtext', 'date', 'datetime', 'timestamp', 'time', 'json']
const ddlSchemas = computed(() => ['practice', 'employees_lab'].filter((s) => auth.canSeeSchema(s)))

const form = reactive<any>({
  schema: 'practice',
  table: '',
  comment: '',
  columns: [] as any[]
})
const previewSql = ref('')
const previewing = ref(false)
const executing = ref(false)

function blankColumn() {
  return {
    name: '',
    type: 'int',
    length: null,
    defaultType: 'NONE',
    defaultValue: '',
    nullable: true,
    primaryKey: false,
    unique: false,
    autoIncrement: false,
    comment: ''
  }
}

function addColumn() {
  form.columns.push(blankColumn())
}

function removeColumn(index: number) {
  form.columns.splice(index, 1)
}

function reset() {
  form.schema = 'practice'
  form.table = ''
  form.comment = ''
  form.columns = [
    { ...blankColumn(), name: 'id', type: 'bigint', nullable: false, primaryKey: true, autoIncrement: true },
    blankColumn()
  ]
  previewSql.value = ''
}

reset()

function close(value: boolean) {
  emit('update:modelValue', value)
}

function buildPayload() {
  return {
    schema: form.schema,
    table: form.table.trim(),
    comment: form.comment,
    columns: form.columns.map((c: any) => ({
      name: c.name.trim(),
      type: c.type,
      length: c.length || null,
      defaultType: c.defaultType,
      defaultValue: c.defaultValue,
      nullable: c.nullable,
      primaryKey: c.primaryKey,
      unique: c.unique,
      autoIncrement: c.autoIncrement,
      comment: c.comment
    }))
  }
}

async function preview() {
  if (!form.table.trim()) {
    ElMessage.warning('请填写表名')
    return
  }
  previewing.value = true
  try {
    const data = await ddlApi.previewCreate(buildPayload())
    previewSql.value = data.sql
  } catch (e) {
    previewSql.value = ''
  } finally {
    previewing.value = false
  }
}

async function execute() {
  executing.value = true
  try {
    await ddlApi.create(buildPayload())
    ElMessage.success('建表成功')
    emit('created', `${form.schema}.${form.table}`)
    close(false)
  } finally {
    executing.value = false
  }
}
</script>

<style scoped>
.column-row {
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}
.column-row-second {
  margin-top: 6px;
}
</style>
