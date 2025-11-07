/**
 * 节点执行器基类
 * 提供通用的执行逻辑和错误处理
 */
import { message } from 'antd'
import type { FormInstance } from 'antd'
import type { ParsedFile } from '@/types'

export interface ExecutorContext {
  form: FormInstance
  executionResult: ParsedFile | null  // 当前节点的执行结果
  upstreamResult?: ParsedFile | null  // 上游节点的执行结果（可选）
  setExecutionResult: (result: ParsedFile) => void
  setExecuting: (executing: boolean) => void
  setExecutionError: (error: string | null) => void
  // 用于获取连接的节点信息（可选）
  getConnectedNode?: (nodeId: string, targetHandle: string) => { node: any; result: ParsedFile | null } | null
}

export interface ExecutorResult {
  success: boolean
  result?: ParsedFile
  error?: string
}

export abstract class BaseExecutor {
  protected context: ExecutorContext

  constructor(context: ExecutorContext) {
    this.context = context
  }

  /**
   * 执行节点逻辑（子类必须实现）
   */
  abstract execute(): Promise<ExecutorResult>

  /**
   * 提取错误信息
   */
  protected extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error
    }
    if (error?.message) {
      return error.message
    }
    if (error?.response?.data?.detail) {
      const detail = error.response.data.detail
      if (Array.isArray(detail)) {
        return detail.map((err: any) => {
          const field = err.loc?.join('.') || '未知字段'
          const msg = err.msg || '验证失败'
          return `${field}: ${msg}`
        }).join('; ')
      }
      return detail
    }
    if (error?.response?.data?.message) {
      return error.response.data.message
    }
    if (typeof error === 'object') {
      return JSON.stringify(error)
    }
    return '操作失败'
  }

  /**
   * 处理执行错误
   */
  protected handleError(error: any, errorKey: string = 'execute'): void {
    const errorMsg = this.extractErrorMessage(error)
    console.error('节点执行错误:', error)
    this.context.setExecutionError(errorMsg)
    message.error({ content: errorMsg, key: errorKey })
  }

  /**
   * 验证必需的上游数据
   * 优先检查上游节点的数据，如果没有则检查当前节点的数据
   */
  protected validateUpstreamData(requiredField: string, fieldName: string): boolean {
    const { upstreamResult, executionResult } = this.context
    // 优先使用上游节点的数据
    const sourceResult = upstreamResult || executionResult
    
    if (!sourceResult || !sourceResult[requiredField as keyof ParsedFile]) {
      if (upstreamResult) {
        message.warning(`上游节点缺少${requiredField}数据，请先执行${fieldName}节点`)
      } else {
        message.warning(`请先执行${fieldName}节点以获取${requiredField}数据，或连接上游节点`)
      }
      return false
    }
    return true
  }
  
  /**
   * 获取数据源（优先使用上游数据）
   */
  protected getSourceResult(): ParsedFile | null {
    const { upstreamResult, executionResult } = this.context
    return upstreamResult || executionResult
  }

  /**
   * 解析JSON字符串
   */
  protected parseJSON(jsonStr: string | undefined, errorMessage: string): any {
    if (!jsonStr) return null
    try {
      return JSON.parse(jsonStr)
    } catch (e) {
      message.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 解析多行字段
   */
  protected parseMultiLineField(fieldStr: string | undefined): string[] | undefined {
    if (!fieldStr) return undefined
    return fieldStr.split('\n').filter((f: string) => f.trim())
  }
}

