import axios from 'axios'
import type {
  ApiResponse,
  UploadedFile,
  ParsedFile,
  SchemaAnalysisResult,
  IntentInferenceResult,
  WorkflowExecution,
  AIModel,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.detail || error.message || '请求失败'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

// 文件管理API
export const fileApi = {
  // 上传文件
  upload: async (file: File): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 解析文件
  parse: async (filePath: string): Promise<ParsedFile> => {
    return api.post('/files/parse', { file_path: filePath })
  },

  // 获取文件列表
  list: async (limit = 50): Promise<{ files: UploadedFile[] }> => {
    return api.get('/files/list', { params: { limit } })
  },

  // 导出文件
  export: async (
    data: Record<string, any>,
    format: string,
    filename?: string
  ): Promise<Blob> => {
    const response = await api.post(
      '/files/export',
      { data, output_format: format, filename },
      { responseType: 'blob' }
    )
    return response
  },
}

// Schema分析API
export const schemaApi = {
  // 分析Schema
  analyze: async (
    data: Record<string, any>,
    useAI = true,
    metadata?: Record<string, any>
  ): Promise<SchemaAnalysisResult> => {
    return api.post('/schemas/analyze', {
      data,
      use_ai: useAI,
      metadata,
    })
  },

  // 推断意图
  inferIntent: async (
    instruction: string,
    schema: Record<string, any>,
    useAI = true
  ): Promise<IntentInferenceResult> => {
    return api.post('/schemas/infer-intent', {
      instruction,
      schema,
      use_ai: useAI,
    })
  },

  // 查找相似Schema
  findSimilar: async (
    schema: Record<string, any>,
    topK = 5
  ): Promise<{ similar_schemas: any[] }> => {
    return api.post('/schemas/similar', {
      schema,
      top_k: topK,
    })
  },

  // 保存Schema
  save: async (
    schema: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<{ schema_id: string; message: string }> => {
    return api.post('/schemas/save', {
      schema,
      metadata,
    })
  },
}

// 工作流API
export const workflowApi = {
  // 执行工作流
  execute: async (
    workflowId: string,
    context: Record<string, any>
  ): Promise<WorkflowExecution> => {
    return api.post(`/workflows/execute/${workflowId}`, context)
  },

  // 获取执行状态
  getStatus: async (executionId: string): Promise<WorkflowExecution> => {
    return api.get(`/workflows/status/${executionId}`)
  },

  // 获取执行历史
  getHistory: async (
    workflowId?: string,
    limit = 10
  ): Promise<{ history: WorkflowExecution[] }> => {
    return api.get('/workflows/history', {
      params: { workflow_id: workflowId, limit },
    })
  },

  // 列出可用工作流
  list: async (): Promise<{ workflows: string[] }> => {
    return api.get('/workflows/list')
  },
}

// AI服务API
export const aiApi = {
  // 聊天
  chat: async (messages: Array<{ role: string; content: string }>): Promise<any> => {
    return api.post('/ai/chat', { messages })
  },

  // 列出可用模型
  listModels: async (): Promise<{ models: AIModel[] }> => {
    return api.get('/ai/models')
  },
}

export default api

