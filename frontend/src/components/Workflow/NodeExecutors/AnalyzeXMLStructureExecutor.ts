/**
 * AI分析XML结构节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { fileApi, aiWorkflowApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class AnalyzeXMLStructureExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    if (!this.validateUpstreamData('data', '解析文件')) {
      return { success: false, error: '缺少上游数据：请先执行解析文件节点，或确保上游节点已执行' }
    }
    
    try {
      const additionalContext = form.getFieldValue('additional_context')
      const includeSample = form.getFieldValue('include_sample') !== false
      
      // 获取原始文件内容（如果可用）
      let sampleContent: string | undefined = undefined
      if (includeSample && sourceResult!.file_path) {
        try {
          const fileContent = await fileApi.getContent(sourceResult!.file_path)
          sampleContent = fileContent.content
        } catch (e) {
          console.warn('无法获取原始文件内容')
        }
      }
      
      message.loading({ content: 'AI正在分析XML结构...', key: 'execute' })
      
      const result = await aiWorkflowApi.analyzeXMLStructure(
        sourceResult!.data,
        sourceResult!.schema,
        sampleContent,
        additionalContext
      )
      
      // 合并结果：保留上游数据，添加新的分析结果
      const updatedResult: ParsedFile = {
        ...sourceResult!,  // 保留上游数据（data, schema, file_path等）
        analysis: result.analysis,  // 添加新的分析结果
      }
      
      setExecutionResult(updatedResult)
      message.success({ content: result.message, key: 'execute' })
      
      return { success: true, result: updatedResult }
    } catch (error: any) {
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

