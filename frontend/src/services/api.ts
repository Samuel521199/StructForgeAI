import axios from 'axios'
import type {
  UploadedFile,
  ParsedFile,
  SchemaAnalysisResult,
  IntentInferenceResult,
  WorkflowExecution,
  WorkflowInfo,
  AIModel,
} from '@/types'

// 开发环境使用代理，生产环境使用完整URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '/api/v1' : 'http://localhost:8001/api/v1')

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
    // 处理 FastAPI 验证错误 (422)
    if (error.response?.status === 422) {
      const detail = error.response.data?.detail
      let message = '请求参数验证失败'
      
      if (Array.isArray(detail)) {
        // FastAPI 验证错误通常返回数组
        const errors = detail.map((err: any) => {
          const field = err.loc?.join('.') || '未知字段'
          const msg = err.msg || '验证失败'
          return `${field}: ${msg}`
        }).join('; ')
        message = `参数验证失败: ${errors}`
      } else if (typeof detail === 'string') {
        message = detail
      } else if (detail) {
        message = JSON.stringify(detail)
      }
      
      console.error('API Validation Error:', message, detail)
      return Promise.reject(new Error(message))
    }
    
    // 处理其他错误（包括 404）
    let message = '请求失败'
    
    // 处理 404 错误
    if (error.response?.status === 404) {
      // 优先使用后端返回的详细错误信息
      if (error.response?.data?.detail) {
        message = error.response.data.detail
      } else {
        // 如果没有 detail，说明可能是路由不存在
        message = `路由不存在: ${error.config?.url || '未知'}`
      }
    } else {
      // 其他错误
      message = error.response?.data?.detail || error.message || '请求失败'
    }
    
    console.error('API Error:', {
      status: error.response?.status,
      message: message,
      detail: error.response?.data,
      url: error.config?.url,
      params: error.config?.params,
      fullResponse: error.response
    })
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
    // 调试：打印请求数据
    const requestData = { file_path: filePath }
    console.log('发送解析请求，数据:', requestData)
    // 响应拦截器已经返回了 response.data，所以这里直接返回
    return api.post('/files/parse', requestData) as Promise<ParsedFile>
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
    return response as unknown as Blob
  },

  // 获取文件内容
  getContent: async (filePath: string): Promise<{ content: string; file_path: string; size: number }> => {
    return api.get('/files/content', { params: { file_path: filePath } })
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

  // 列出可用工作流（返回详细信息）
  list: async (): Promise<{ workflows: WorkflowInfo[] }> => {
    return api.get('/workflows/list')
  },

  // 保存工作流定义
  save: async (
    workflowId: string,
    workflowData: { nodes: any[]; edges: any[]; name?: string; description?: string; is_active?: boolean }
  ): Promise<{ workflow_id: string; message: string }> => {
    return api.post(`/workflows/save/${workflowId}`, workflowData)
  },

  // 加载工作流定义
  load: async (workflowId: string): Promise<{ nodes: any[]; edges: any[]; name?: string; description?: string; is_active?: boolean }> => {
    return api.get(`/workflows/load/${workflowId}`)
  },

  // 删除工作流
  delete: async (workflowId: string): Promise<{ workflow_id: string; message: string }> => {
    console.log('API调用删除工作流:', workflowId)
    try {
      const response = await api.delete(`/workflows/${workflowId}`)
      console.log('删除工作流响应:', response.data)
      return response.data
    } catch (error: any) {
      console.error('删除工作流API错误:', error)
      console.error('错误详情:', error?.response?.data)
      throw error
    }
  },

  // 切换工作流激活状态
  toggleActive: async (workflowId: string, isActive: boolean): Promise<{ workflow_id: string; is_active: boolean; message: string }> => {
    return api.patch(`/workflows/${workflowId}/active`, { is_active: isActive })
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

