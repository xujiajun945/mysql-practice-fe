<template>
  <div class="login-page">
    <div class="login-card">
      <h2>MySQL 练习平台</h2>
      <p class="muted">浏览 schema、建表改表、写 SQL、做 employees 练习并批阅</p>
      <el-tabs v-model="tab">
        <el-tab-pane label="登录" name="login">
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="form.username" placeholder="请输入用户名" @keyup.enter="doLogin" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" @keyup.enter="doLogin" />
            </el-form-item>
            <el-button type="primary" class="full" :loading="loading" @click="doLogin">登录</el-button>
          </el-form>
          <div class="status-line">
            <el-input v-model="statusUsername" placeholder="输入用户名查询审批状态" size="small" />
            <el-button size="small" @click="queryStatus">查询</el-button>
          </div>
          <el-alert v-if="statusText" :title="statusText" type="info" :closable="false" class="status-alert" />
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="registerForm.username" placeholder="3-20 个字符" />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="registerForm.nickname" placeholder="显示名称" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="registerForm.password" type="password" show-password placeholder="至少 6 位" />
            </el-form-item>
            <el-button type="primary" class="full" :loading="registering" @click="doRegister">提交注册</el-button>
            <p class="muted tip">注册后账号处于待审批状态，需管理员审批通过后才能使用。</p>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../api'

const auth = useAuthStore()
const router = useRouter()

const tab = ref('login')
const loading = ref(false)
const registering = ref(false)
const form = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', nickname: '', password: '' })
const statusUsername = ref('')
const statusText = ref('')

async function doLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.signIn(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/tables')
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  registering.value = true
  try {
    await authApi.register({ ...registerForm, nickname: registerForm.nickname || registerForm.username })
    ElMessage.success('注册成功，请等待管理员审批')
    statusUsername.value = registerForm.username
    tab.value = 'login'
  } finally {
    registering.value = false
  }
}

async function queryStatus() {
  if (!statusUsername.value) return
  try {
    const data = await authApi.status(statusUsername.value)
    statusText.value = `用户 ${data.username} 当前状态：${data.status}${data.rejectReason ? '，原因：' + data.rejectReason : ''}`
  } catch (e) {
    statusText.value = ''
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2d3d 0%, #2b4a6f 100%);
}
.login-card {
  width: 420px;
  max-width: 92vw;
  box-sizing: border-box;
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
@media (max-width: 768px) {
  .login-card {
    padding: 20px;
    border-radius: 10px;
  }
}
.login-card h2 {
  margin: 0 0 6px;
}
.full {
  width: 100%;
  margin-top: 8px;
}
.status-line {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.status-alert {
  margin-top: 12px;
}
.tip {
  margin-top: 10px;
}
</style>
