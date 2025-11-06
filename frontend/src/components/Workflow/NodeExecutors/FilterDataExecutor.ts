/**
 * 过滤数据节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { dataApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class FilterDataExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, executionResult, setExecutionResult } = this.context
    
    const filterConditionStr = form.getFieldValue('filter_condition')
    if (!filterConditionStr) {
      message.error('请设置过滤条件')
      return { success: false, error: '过滤条件未设置' }
    }
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    if (!this.validateUpstreamData('data', '解析文件')) {
      return { success: false, error: '缺少上游数据：请先执行解析文件节点，或确保上游节点已执行' }
    }
    
    try {
      const filterCondition = this.parseJSON(filterConditionStr, '过滤条件格式错误，请检查JSON格式')
      const path = form.getFieldValue('path')
      
      message.loading({ content: '正在过滤数据...', key: 'execute' })
      
      const result = await dataApi.filter(
        sourceResult!.data,
        filterCondition,
        path
      )
      
      // 合并结果：保留上游数据，更新data
      const updatedResult: ParsedFile = {
        ...sourceResult!,
        data: result.filtered_data,
      }
      
      setExecutionResult(updatedResult)
      message.success({ content: `找到 ${result.count} 个匹配的条目`, key: 'execute' })
      
      return { success: true, result: updatedResult }
    } catch (error: any) {
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

