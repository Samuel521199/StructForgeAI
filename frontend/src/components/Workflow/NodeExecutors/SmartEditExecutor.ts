/**
 * 智能编辑节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { aiWorkflowApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class SmartEditExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, executionResult, setExecutionResult } = this.context
    
    const instruction = form.getFieldValue('instruction')
    if (!instruction || instruction.trim() === '') {
      message.error('请输入编辑指令')
      return { success: false, error: '编辑指令未设置' }
    }
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    if (!this.validateUpstreamData('data', '解析文件')) {
      return { success: false, error: '缺少上游数据：请先执行解析文件节点，或确保上游节点已执行' }
    }
    
    try {
      const useStructure = form.getFieldValue('use_structure') !== false
      const useEditorConfig = form.getFieldValue('use_editor_config') !== false
      
      message.loading({ content: 'AI正在智能编辑数据...', key: 'execute' })
      
      const result = await aiWorkflowApi.smartEdit(
        sourceResult!.data,
        instruction,
        useStructure ? sourceResult!.analysis : undefined,
        useEditorConfig ? sourceResult!.editor_config : undefined
      )
      
      // 合并结果：保留上游数据，添加智能编辑结果
      let updatedResult: ParsedFile
      if (result.result.edited_data) {
        updatedResult = {
          ...sourceResult!,
          data: result.result.edited_data,
          smart_edit_result: result.result,
        }
      } else {
        updatedResult = {
          ...sourceResult!,
          smart_edit_result: result.result,
        }
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

