import { api, clearAuth } from './http'

export interface UserView {
  id: number
  username: string
  nickname: string
  status: string
  roleCode: string
  roleName: string
  capabilities: string[]
  schemas: string[]
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserView
}

export const authApi = {
  login: (username: string, password: string) => api.post<TokenPair>('/auth/login', { username, password }),
  register: (payload: { username: string; password: string; nickname: string }) => api.post<UserView>('/auth/register', payload),
  refresh: (refreshToken: string) => api.post<TokenPair>('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string | null) => api.post<void>('/auth/logout', { refreshToken }),
  me: () => api.get<UserView>('/me'),
  status: (username: string) => api.get<{ username: string; status: string; rejectReason?: string }>('/me/status', { username }),
  changePassword: (oldPassword: string, newPassword: string) => api.post<void>('/me/password', { oldPassword, newPassword })
}

export const metaApi = {
  schemas: () => api.get<any[]>('/meta/schemas'),
  tables: (schema: string) => api.get<any[]>(`/meta/schemas/${schema}/tables`),
  detail: (schema: string, table: string) => api.get<any>(`/meta/schemas/${schema}/tables/${table}`),
  preview: (schema: string, table: string, limit = 20) =>
    api.get<any>(`/meta/schemas/${schema}/tables/${table}/preview`, { limit })
}

export const ddlApi = {
  previewCreate: (payload: any) => api.post<any>('/ddl/create/preview', payload),
  create: (payload: any) => api.post<any>('/ddl/create', payload),
  previewDrop: (payload: any) => api.post<any>('/ddl/drop/preview', payload),
  drop: (payload: any) => api.post<any>('/ddl/drop', payload),
  previewAddColumn: (payload: any) => api.post<any>('/ddl/column/preview', payload),
  addColumn: (payload: any) => api.post<any>('/ddl/column/add', payload),
  previewDropColumn: (payload: any) => api.post<any>('/ddl/column/drop/preview', payload),
  dropColumn: (payload: any) => api.post<any>('/ddl/column/drop', payload),
  previewAddIndex: (payload: any) => api.post<any>('/ddl/index/add/preview', payload),
  addIndex: (payload: any) => api.post<any>('/ddl/index/add', payload),
  previewDropIndex: (payload: any) => api.post<any>('/ddl/index/drop/preview', payload),
  dropIndex: (payload: any) => api.post<any>('/ddl/index/drop', payload)
}

export const sqlApi = {
  execute: (schema: string, sql: string) => api.post<any>('/sql/execute', { schema, sql })
}

export const quizApi = {
  createAttempt: () => api.post<any>('/quiz/attempts'),
  myAttempts: () => api.get<any[]>('/quiz/attempts'),
  attempt: (id: number) => api.get<any>(`/quiz/attempts/${id}`),
  submitAnswer: (attemptId: number, questionId: number, sql: string) =>
    api.post<any>(`/quiz/attempts/${attemptId}/answers/${questionId}`, { sql }),
  testAnswer: (attemptId: number, questionId: number, sql: string) =>
    api.post<any>(`/quiz/attempts/${attemptId}/questions/${questionId}/test`, { sql }),
  submitAttempt: (attemptId: number) => api.post<any>(`/quiz/attempts/${attemptId}/submit`)
}

export const adminApi = {
  users: () => api.get<any[]>('/admin/users'),
  createUser: (payload: any) => api.post<void>('/admin/users', payload),
  approve: (id: number, roleId?: number) => api.post<void>(`/admin/users/${id}/approve`, { roleId }),
  reject: (id: number, reason?: string) => api.post<void>(`/admin/users/${id}/reject`, { reason }),
  updateUser: (id: number, payload: any) => api.put<void>(`/admin/users/${id}`, payload),
  resetPassword: (id: number, password: string) => api.post<void>(`/admin/users/${id}/password`, { password }),
  roles: () => api.get<any[]>('/admin/roles'),
  createRole: (payload: any) => api.post<any>('/admin/roles', payload),
  updateRole: (id: number, payload: any) => api.put<any>(`/admin/roles/${id}`, payload),
  deleteRole: (id: number) => api.del<void>(`/admin/roles/${id}`),
  questions: () => api.get<any[]>('/admin/questions'),
  createQuestion: (payload: any) => api.post<any>('/admin/questions', payload),
  updateQuestion: (id: number, payload: any) => api.put<any>(`/admin/questions/${id}`, payload),
  deleteQuestion: (id: number) => api.del<void>(`/admin/questions/${id}`),
  testQuestion: (id: number) => api.post<any>(`/admin/questions/${id}/test`),
  reviewQueue: (status = 'PENDING_REVIEW') => api.get<any[]>('/admin/reviews', { status }),
  reviewDetail: (attemptId: number) => api.get<any>(`/admin/reviews/${attemptId}`),
  reviewAnswer: (attemptId: number, answerId: number, correct: boolean, comment?: string) =>
    api.post<void>(`/admin/reviews/${attemptId}/answers/${answerId}`, { correct, comment }),
  completeReview: (attemptId: number, overallComment?: string) =>
    api.post<any>(`/admin/reviews/${attemptId}/complete`, { overallComment }),
  audit: (page = 1, size = 20) => api.get<any>('/admin/audit', { page, size }),
  resetSandbox: () => api.post<any>('/admin/sandbox/reset')
}

export { clearAuth }
