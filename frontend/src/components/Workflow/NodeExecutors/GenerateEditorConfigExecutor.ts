/**
 * 生成编辑器配置节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { aiWorkflowApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class GenerateEditorConfigExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, executionResult, setExecutionResult } = this.context
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    if (!this.validateUpstreamData('analysis', 'AI分析XML结构')) {
      return { success: false, error: '缺少上游数据：请先执行AI分析XML结构节点，或确保上游节点已执行' }
    }
    
    try {
      const editorType = form.getFieldValue('editor_type') || 'form'
      const customFieldsStr = form.getFieldValue('custom_fields')
      const customFields = this.parseMultiLineField(customFieldsStr)
      
      message.loading({ content: '正在生成编辑器配置...', key: 'execute' })
      
      const result = await aiWorkflowApi.generateEditorConfig(
        sourceResult!.analysis!,
        editorType,
        customFields
      )
      
      // 合并结果：保留上游数据，添加编辑器配置
      const updatedResult: ParsedFile = {
        ...sourceResult!,
        editor_config: result.editor_config,
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

