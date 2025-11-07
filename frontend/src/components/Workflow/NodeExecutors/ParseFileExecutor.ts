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
    const convertFormat = form.getFieldValue('convert_format') || false
    const outputFormat = form.getFieldValue('output_format')
    const skipSchema = form.getFieldValue('skip_schema') || false
    
    if (!filePath || filePath.trim() === '') {
      message.error('请先设置文件路径')
      return { success: false, error: '文件路径未设置' }
    }
    
    try {
      const loadingMessage = convertFormat 
        ? `正在解析文件并转换为 ${outputFormat?.toUpperCase() || '目标格式'}...`
        : '正在解析文件...'
      message.loading({ content: loadingMessage, key: 'execute' })
      
      console.log('[ParseFileExecutor] 准备解析文件，路径:', filePath)
      console.log('[ParseFileExecutor] 解析选项:', {
        convertFormat,
        outputFormat,
        skipSchema,
      })
      
      const result = await fileApi.parse(filePath, {
        convert_format: convertFormat,
        output_format: outputFormat,
        skip_schema: skipSchema,
      })
      
      console.log('[ParseFileExecutor] 文件解析成功，结果:', result ? '有数据' : '无数据')
      console.log('[ParseFileExecutor] 解析结果详情:', {
        hasData: !!result.data,
        hasSchema: !!result.schema,
        filePath: result.file_path,
        outputFormat: result.output_format,
        originalFormat: result.original_format,
      })
      
      // 调用 setExecutionResult 回调，这会同时更新本地状态和全局 Map
      console.log('[ParseFileExecutor] 调用 setExecutionResult 回调')
      setExecutionResult(result)
      console.log('[ParseFileExecutor] setExecutionResult 回调已调用')
      
      const successMessage = convertFormat && outputFormat
        ? `文件解析成功，已转换为 ${outputFormat.toUpperCase()} 格式`
        : '文件解析成功'
      message.success({ content: successMessage, key: 'execute' })
      
      return { success: true, result }
    } catch (error: any) {
      console.error('[ParseFileExecutor] 文件解析失败:', error)
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

