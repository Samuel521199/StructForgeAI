/**
 * 解析文件节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { fileApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class ParseFileExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    const filePath = form.getFieldValue('file_path')
    
    if (!filePath || filePath.trim() === '') {
      message.error('请先设置文件路径')
      return { success: false, error: '文件路径未设置' }
    }
    
    try {
      message.loading({ content: '正在解析文件...', key: 'execute' })
      console.log('[ParseFileExecutor] 准备解析文件，路径:', filePath)
      
      const result = await fileApi.parse(filePath)
      console.log('[ParseFileExecutor] 文件解析成功，结果:', result ? '有数据' : '无数据')
      console.log('[ParseFileExecutor] 解析结果详情:', {
        hasData: !!result.data,
        hasSchema: !!result.schema,
        filePath: result.file_path,
      })
      
      // 调用 setExecutionResult 回调，这会同时更新本地状态和全局 Map
      console.log('[ParseFileExecutor] 调用 setExecutionResult 回调')
      setExecutionResult(result)
      console.log('[ParseFileExecutor] setExecutionResult 回调已调用')
      
      message.success({ content: '文件解析成功', key: 'execute' })
      
      return { success: true, result }
    } catch (error: any) {
      console.error('[ParseFileExecutor] 文件解析失败:', error)
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

