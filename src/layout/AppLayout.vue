<template>
  <el-container class="layout">
    <el-drawer v-if="isMobile" v-model="drawerVisible" class="mobile-drawer" direction="ltr" size="240px" :with-header="false">
      <div class="brand">MySQL 练习平台</div>
      <el-menu :default-active="activePath" router class="menu" @select="drawerVisible = false">
        <el-menu-item v-for="m in mainMenus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </el-menu-item>
        <el-sub-menu v-if="adminMenus.length" index="admin">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>管理后台</span>
          </template>
          <el-menu-item v-for="m in adminMenus" :key="m.path" :index="m.path">{{ m.label }}</el-menu-item>
        </el-sub-menu>
      </el-menu>
      <div class="drawer-footer">
        <el-button text @click="openPasswordFromDrawer">修改密码</el-button>
      </div>
    </el-drawer>

    <el-aside v-if="!isMobile" width="220px" class="aside">
      <div class="brand">MySQL 练习平台</div>
      <el-menu :default-active="activePath" router class="menu">
        <el-menu-item v-for="m in mainMenus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </el-menu-item>
        <el-sub-menu v-if="adminMenus.length" index="admin">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>管理后台</span>
          </template>
          <el-menu-item v-for="m in adminMenus" :key="m.path" :index="m.path">{{ m.label }}</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button v-if="isMobile" text class="burger" @click="drawerVisible = true">
            <el-icon><Menu /></el-icon>
          </el-button>
          <span v-if="isMobile" class="brand-mobile">MySQL 练习平台</span>
          <span v-else class="muted">{{ roleText }}</span>
        </div>
        <div class="right">
          <span v-if="!isMobile" class="user-name">{{ auth.user?.nickname || auth.user?.username }}</span>
          <el-button v-if="!isMobile" text @click="passwordVisible = true">修改密码</el-button>
          <el-button text type="danger" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>

    <el-dialog v-model="passwordVisible" title="修改密码" width="420px">
      <el-form label-width="90px">
        <el-form-item label="原密码"><el-input v-model="oldPassword" type="password" show-password /></el-form-item>
        <el-form-item label="新密码"><el-input v-model="newPassword" type="password" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="changePassword">保存</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Grid, EditPen, Notebook, Setting, Menu } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../api'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const activePath = computed(() => route.path)
const roleText = computed(() => (auth.user ? `${auth.user.roleName}（${auth.user.roleCode}）` : ''))

const mainMenus = [
  { path: '/tables', label: '数据库浏览', icon: Grid },
  { path: '/sql', label: '自定义 SQL', icon: EditPen },
  { path: '/quiz', label: '做题练习', icon: Notebook }
]

const adminMenus = computed(() => {
  const list: { path: string; label: string }[] = []
  if (auth.hasCap('USER_ADMIN')) {
    list.push({ path: '/admin/users', label: '用户与审批' })
    list.push({ path: '/admin/roles', label: '角色与权限' })
  }
  if (auth.hasCap('QUESTION_ADMIN')) list.push({ path: '/admin/questions', label: '题库管理' })
  if (auth.hasCap('REVIEW')) list.push({ path: '/admin/reviews', label: '答题批阅' })
  if (auth.hasCap('AUDIT_VIEW')) list.push({ path: '/admin/audit', label: '审计日志' })
  if (auth.hasCap('USER_ADMIN')) list.push({ path: '/admin/sandbox', label: '沙盒重置' })
  return list
})

const isMobile = ref(window.innerWidth <= 768)
const drawerVisible = ref(false)
const passwordVisible = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const saving = ref(false)

function syncViewport() {
  isMobile.value = window.innerWidth <= 768
}

function openPasswordFromDrawer() {
  drawerVisible.value = false
  passwordVisible.value = true
}

async function changePassword() {
  if (!oldPassword.value || !newPassword.value) {
    ElMessage.warning('请填写完整')
    return
  }
  saving.value = true
  try {
    await authApi.changePassword(oldPassword.value, newPassword.value)
    ElMessage.success('密码已修改')
    passwordVisible.value = false
    oldPassword.value = ''
    newPassword.value = ''
  } finally {
    saving.value = false
  }
}

async function logout() {
  await auth.signOut()
  router.push('/login')
}

onMounted(() => window.addEventListener('resize', syncViewport))
onBeforeUnmount(() => window.removeEventListener('resize', syncViewport))
</script>

<style scoped>
.layout {
  height: 100%;
}
.aside {
  background: #1f2d3d;
  color: #fff;
}
.brand {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-weight: 600;
  color: #fff;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.menu {
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #d0d7e2;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.08);
  --el-menu-active-color: #409eff;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.user-name {
  font-weight: 600;
  margin-right: 8px;
}
.burger {
  padding: 0 4px;
}
.brand-mobile {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}
.drawer-footer {
  padding: 12px 16px;
}
@media (max-width: 768px) {
  .header {
    padding: 0 10px;
    height: 52px;
  }
  .brand-mobile {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
