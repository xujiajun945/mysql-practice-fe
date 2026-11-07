<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="brand">MySQL 练习平台</div>
      <el-menu :default-active="activePath" router class="menu">
        <el-menu-item index="/tables">
          <el-icon><Grid /></el-icon>
          <span>数据库浏览</span>
        </el-menu-item>
        <el-menu-item index="/sql">
          <el-icon><EditPen /></el-icon>
          <span>自定义 SQL</span>
        </el-menu-item>
        <el-menu-item index="/quiz">
          <el-icon><Notebook /></el-icon>
          <span>做题练习</span>
        </el-menu-item>
        <el-sub-menu v-if="isAdmin" index="admin">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>管理后台</span>
          </template>
          <el-menu-item v-if="auth.hasCap('USER_ADMIN')" index="/admin/users">用户与审批</el-menu-item>
          <el-menu-item v-if="auth.hasCap('USER_ADMIN')" index="/admin/roles">角色与权限</el-menu-item>
          <el-menu-item v-if="auth.hasCap('QUESTION_ADMIN')" index="/admin/questions">题库管理</el-menu-item>
          <el-menu-item v-if="auth.hasCap('REVIEW')" index="/admin/reviews">答题批阅</el-menu-item>
          <el-menu-item v-if="auth.hasCap('AUDIT_VIEW')" index="/admin/audit">审计日志</el-menu-item>
          <el-menu-item v-if="auth.hasCap('USER_ADMIN')" index="/admin/sandbox">沙盒重置</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="muted">{{ roleText }}</div>
        <div class="right">
          <span class="user-name">{{ auth.user?.nickname || auth.user?.username }}</span>
          <el-button text @click="passwordVisible = true">修改密码</el-button>
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Grid, EditPen, Notebook, Setting } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../api'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const activePath = computed(() => route.path)
const roleText = computed(() => (auth.user ? `${auth.user.roleName}（${auth.user.roleCode}）` : ''))
const isAdmin = computed(() => auth.caps.some((c) => ['USER_ADMIN', 'QUESTION_ADMIN', 'REVIEW', 'AUDIT_VIEW'].includes(c)))

const passwordVisible = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const saving = ref(false)

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
.right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-name {
  font-weight: 600;
  margin-right: 8px;
}
</style>
