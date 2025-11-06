/**
 * 编辑数据节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { dataApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class EditDataExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, executionResult, setExecutionResult } = this.context
    
    const operation = form.getFieldValue('operation')
    const path = form.getFieldValue('path')
    
    if (!operation || !path) {
      message.error('请设置操作类型和数据路径')
      return { success: false, error: '配置不完整' }
    }
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    if (!this.validateUpstreamData('data', '解析文件')) {
      return { success: false, error: '缺少上游数据：请先执行解析文件节点，或确保上游节点已执行' }
    }
    
    try {
      const itemDataStr = form.getFieldValue('item_data')
      const filterConditionStr = form.getFieldValue('filter_condition')
      
      const itemData = this.parseJSON(itemDataStr, '条目数据格式错误，请检查JSON格式')
      const filterCondition = this.parseJSON(filterConditionStr, '过滤条件格式错误，请检查JSON格式')
      
      message.loading({ content: '正在编辑数据...', key: 'execute' })
      
      const result = await dataApi.edit(
        sourceResult!.data,
        operation,
        path,
        itemData,
        filterCondition
      )
      
      // 合并结果：保留上游数据，更新data
      const updatedResult: ParsedFile = {
        ...sourceResult!,
        data: result.data,
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

