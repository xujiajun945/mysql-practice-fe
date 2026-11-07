<template>
  <div class="tables-page">
    <div class="card-block schema-panel">
      <div class="page-title">Schema</div>
      <el-menu :default-active="activeSchema" class="schema-menu" @select="selectSchema">
        <el-menu-item v-for="s in schemas" :key="s.name" :index="s.name">
          <span>{{ s.name }}</span>
          <span class="muted charset">{{ s.charset }}</span>
        </el-menu-item>
      </el-menu>
    </div>

    <div class="card-block table-panel">
      <div class="toolbar">
        <div class="page-title" style="margin: 0">{{ activeSchema || '请选择 schema' }}</div>
        <div style="flex: 1"></div>
        <el-input v-model="keyword" class="table-search" placeholder="搜索表名" clearable />
        <el-button @click="loadTables">刷新</el-button>
        <el-button v-if="canCreate" type="primary" @click="createVisible = true">新建表</el-button>
      </div>
      <el-alert v-if="activeSchema && !ddlSchemas.includes(activeSchema)" type="info" :closable="false"
        title="该 schema 为只读示例库，DDL 操作仅在 practice / employees_lab 中开放" style="margin-bottom: 12px" />
      <el-table :data="filteredTables" v-loading="loading" @row-click="openTable" style="width: 100%">
        <el-table-column prop="name" label="表名" min-width="180" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="rowCount" label="行数（估算）" width="130" />
        <el-table-column prop="sizeKb" label="大小 KB" width="110" />
        <el-table-column prop="comment" label="备注" min-width="160" />
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button text type="primary" @click.stop="openTable(scope.row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <CreateTableDialog v-model="createVisible" :schema="activeSchema" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { metaApi } from '../api'
import { useAuthStore } from '../stores/auth'
import CreateTableDialog from '../components/CreateTableDialog.vue'

const auth = useAuthStore()
const router = useRouter()
const schemas = ref<any[]>([])
const tables = ref<any[]>([])
const activeSchema = ref('')
const keyword = ref('')
const loading = ref(false)
const createVisible = ref(false)
const ddlSchemas = ['practice', 'employees_lab']

const canCreate = computed(() => auth.hasCap('CREATE_TABLE'))
const filteredTables = computed(() =>
  tables.value.filter((t) => !keyword.value || t.name.toLowerCase().includes(keyword.value.toLowerCase()))
)

async function loadSchemas() {
  schemas.value = await metaApi.schemas()
  if (!activeSchema.value && schemas.value.length) {
    const preferred = schemas.value.find((s) => s.name === 'practice') || schemas.value[0]
    selectSchema(preferred.name)
  }
}

async function selectSchema(name: string) {
  activeSchema.value = name
  await loadTables()
}

async function loadTables() {
  if (!activeSchema.value) return
  loading.value = true
  try {
    tables.value = await metaApi.tables(activeSchema.value)
  } finally {
    loading.value = false
  }
}

function openTable(row: any) {
  router.push(`/tables/${activeSchema.value}/${row.name}`)
}

function onCreated(fullName: string) {
  ElMessage.success(`已创建 ${fullName}`)
  loadTables()
}

onMounted(loadSchemas)
</script>

<style scoped>
.tables-page {
  display: flex;
  gap: 16px;
  height: 100%;
}
.schema-panel {
  width: 240px;
  flex: none;
  overflow: auto;
}
.table-panel {
  flex: 1;
  overflow: auto;
}
.schema-menu {
  border-right: none;
}
.charset {
  margin-left: 8px;
}
.table-search {
  width: 200px;
}
@media (max-width: 768px) {
  .tables-page {
    flex-direction: column;
    height: auto;
    gap: 12px;
  }
  .schema-panel {
    width: 100%;
    max-height: none;
  }
  .table-panel {
    width: 100%;
  }
  .table-search {
    width: 100%;
  }
}
</style>
