/**
 * Memory 节点执行器
 * 支持存储、检索、搜索、删除记忆
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { memoryApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class MemoryExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    try {
      const operation = form.getFieldValue('operation') || 'store'
      const memoryType = form.getFieldValue('memory_type') || 'workflow'
      
      // 验证必需字段
      if (!memoryType) {
        return { success: false, error: '请选择记忆类型' }
      }
      
      let result: any
      
      if (operation === 'store') {
        // 存储操作
        const key = form.getFieldValue('key')
        const valueSource = form.getFieldValue('value_source') || 'upstream'
        const workflowId = form.getFieldValue('workflow_id')
        const sessionId = form.getFieldValue('session_id')
        const metadataStr = form.getFieldValue('metadata')
        const ttl = form.getFieldValue('ttl')
        
        if (!key || key.trim() === '') {
          return { success: false, error: '请输入键名' }
        }
        
        // 获取值
        let value: any
        if (valueSource === 'manual') {
          const valueStr = form.getFieldValue('value')
          if (!valueStr || valueStr.trim() === '') {
            return { success: false, error: '请输入值（JSON格式）' }
          }
          try {
            value = JSON.parse(valueStr)
          } catch (e) {
            return { success: false, error: '值的 JSON 格式错误，请检查' }
          }
        } else {
          // 从上游节点提取
          if (!sourceResult) {
            return { success: false, error: '无法从上游节点提取值，请确保已连接上游节点或使用手动输入' }
          }
          // 优先使用 analysis，然后是 data，最后是整个结果
          if (sourceResult.analysis) {
            value = sourceResult.analysis
          } else if (sourceResult.data) {
            value = sourceResult.data
          } else {
            value = sourceResult
          }
        }
        
        // 解析元数据
        let metadata: any = undefined
        if (metadataStr && metadataStr.trim() !== '') {
          try {
            metadata = JSON.parse(metadataStr)
          } catch (e) {
            return { success: false, error: '元数据的 JSON 格式错误，请检查' }
          }
        }
        
        message.loading({ content: '正在存储记忆...', key: 'execute' })
        
        result = await memoryApi.store({
          memory_type: memoryType,
          key: key,
          value: value,
          workflow_id: workflowId || undefined,
          session_id: sessionId || undefined,
          metadata: metadata,
          ttl: ttl || undefined,
        })
        
        // 合并结果：保留上游数据，添加存储结果
        const updatedResult: ParsedFile = {
          ...(sourceResult || {
            hasData: false,
            hasSchema: false,
            hasAnalysis: false,
          }),
          memory_result: {
            operation: 'store',
            key: key,
            memory_type: memoryType,
            success: result.success,
            stored_at: new Date().toISOString(),
          },
        }
        
        setExecutionResult(updatedResult)
        message.success({ content: result.message, key: 'execute' })
        
        return { success: true, result: updatedResult }
      }
      
      else if (operation === 'retrieve') {
        // 检索操作
        const key = form.getFieldValue('key')
        const workflowId = form.getFieldValue('workflow_id')
        const sessionId = form.getFieldValue('session_id')
        const limit = form.getFieldValue('limit') || 100
        
        message.loading({ content: '正在检索记忆...', key: 'execute' })
        
        result = await memoryApi.retrieve({
          memory_type: memoryType,
          key: key || undefined,
          workflow_id: workflowId || undefined,
          session_id: sessionId || undefined,
          limit: limit,
        })
        
        // 合并结果：保留上游数据，添加检索结果
        const updatedResult: ParsedFile = {
          ...(sourceResult || {
            hasData: false,
            hasSchema: false,
            hasAnalysis: false,
          }),
          memory_result: {
            operation: 'retrieve',
            memory_type: memoryType,
            memories: result.data.memories,
            count: result.data.count,
            retrieved_at: new Date().toISOString(),
          },
        }
        
        setExecutionResult(updatedResult)
        message.success({ content: result.message, key: 'execute' })
        
        return { success: true, result: updatedResult }
      }
      
      else if (operation === 'search') {
        // 搜索操作
        const query = form.getFieldValue('query')
        const workflowId = form.getFieldValue('workflow_id')
        const limit = form.getFieldValue('limit') || 10
        
        if (!query || query.trim() === '') {
          return { success: false, error: '请输入搜索关键词' }
        }
        
        message.loading({ content: '正在搜索记忆...', key: 'execute' })
        
        result = await memoryApi.search({
          query: query,
          memory_type: memoryType,
          workflow_id: workflowId || undefined,
          limit: limit,
        })
        
        // 合并结果：保留上游数据，添加搜索结果
        const updatedResult: ParsedFile = {
          ...(sourceResult || {
            hasData: false,
            hasSchema: false,
            hasAnalysis: false,
          }),
          memory_result: {
            operation: 'search',
            query: query,
            memory_type: memoryType,
            memories: result.data.memories,
            count: result.data.count,
            searched_at: new Date().toISOString(),
          },
        }
        
        setExecutionResult(updatedResult)
        message.success({ content: result.message, key: 'execute' })
        
        return { success: true, result: updatedResult }
      }
      
      else if (operation === 'delete') {
        // 删除操作
        const key = form.getFieldValue('key')
        const workflowId = form.getFieldValue('workflow_id')
        const sessionId = form.getFieldValue('session_id')
        
        message.loading({ content: '正在删除记忆...', key: 'execute' })
        
        result = await memoryApi.delete({
          memory_type: memoryType,
          key: key || undefined,
          workflow_id: workflowId || undefined,
          session_id: sessionId || undefined,
        })
        
        // 合并结果：保留上游数据，添加删除结果
        const updatedResult: ParsedFile = {
          ...(sourceResult || {
            hasData: false,
            hasSchema: false,
            hasAnalysis: false,
          }),
          memory_result: {
            operation: 'delete',
            memory_type: memoryType,
            deleted_count: result.data.deleted_count,
            deleted_at: new Date().toISOString(),
          },
        }
        
        setExecutionResult(updatedResult)
        message.success({ content: result.message, key: 'execute' })
        
        return { success: true, result: updatedResult }
      }
      
      else {
        return { success: false, error: `不支持的操作类型: ${operation}` }
      }
      
    } catch (error: any) {
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

