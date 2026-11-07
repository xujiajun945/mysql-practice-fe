import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../layout/AppLayout.vue'),
      children: [
        { path: '', redirect: '/tables' },
        { path: 'tables', component: () => import('../views/TablesView.vue') },
        { path: 'tables/:schema/:table', component: () => import('../views/TableDetailView.vue') },
        { path: 'sql', component: () => import('../views/SqlConsoleView.vue') },
        { path: 'quiz', component: () => import('../views/QuizView.vue') },
        { path: 'quiz/:id', component: () => import('../views/QuizAttemptView.vue') },
        { path: 'admin/users', component: () => import('../views/AdminUsersView.vue'), meta: { cap: 'USER_ADMIN' } },
        { path: 'admin/roles', component: () => import('../views/AdminRolesView.vue'), meta: { cap: 'USER_ADMIN' } },
        { path: 'admin/questions', component: () => import('../views/AdminQuestionsView.vue'), meta: { cap: 'QUESTION_ADMIN' } },
        { path: 'admin/reviews', component: () => import('../views/AdminReviewsView.vue'), meta: { cap: 'REVIEW' } },
        { path: 'admin/reviews/:attemptId', component: () => import('../views/AdminReviewDetailView.vue'), meta: { cap: 'REVIEW' } },
        { path: 'admin/audit', component: () => import('../views/AdminAuditView.vue'), meta: { cap: 'AUDIT_VIEW' } },
        { path: 'admin/sandbox', component: () => import('../views/AdminSandboxView.vue'), meta: { cap: 'USER_ADMIN' } }
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    return true
  }
  if (!auth.accessToken) {
    return '/login'
  }
  if (!auth.user) {
    try {
      await auth.loadMe()
    } catch (e) {
      return '/login'
    }
  }
  const cap = to.meta.cap as string | undefined
  if (cap && !auth.hasCap(cap)) {
    ElMessage.warning('当前账号没有访问该页面的权限')
    return '/tables'
  }
  return true
})

export default router
