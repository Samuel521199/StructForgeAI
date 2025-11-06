/**
 * 生成工作流节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { aiWorkflowApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class GenerateWorkflowExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, executionResult, setExecutionResult } = this.context
    
    if (!this.validateUpstreamData('analysis', 'AI分析XML结构')) {
      return { success: false, error: '缺少上游数据' }
    }
    
    try {
      const workflowType = form.getFieldValue('workflow_type') || 'edit'
      const targetFormat = form.getFieldValue('target_format')
      
      message.loading({ content: 'AI正在生成工作流定义...', key: 'execute' })
      
      const result = await aiWorkflowApi.generateWorkflow(
        executionResult!.analysis!,
        executionResult!.editor_config,
        workflowType,
        targetFormat
      )
      
      const updatedResult: ParsedFile = {
        ...executionResult!,
        generated_workflow: result.workflow,
      }
      
      setExecutionResult(updatedResult)
      message.success({ 
        content: result.message + '（工作流定义已生成，可在OUTPUT面板查看）', 
        key: 'execute',
        duration: 5
      })
      
      return { success: true, result: updatedResult }
    } catch (error: any) {
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

