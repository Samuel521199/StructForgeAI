/**
 * 验证数据节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { dataApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class ValidateDataExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, executionResult, setExecutionResult } = this.context
    
    // 获取数据源（优先使用上游数据）
    const sourceResult = this.getSourceResult()
    
    if (!this.validateUpstreamData('data', '解析文件')) {
      return { success: false, error: '缺少上游数据：请先执行解析文件节点，或确保上游节点已执行' }
    }
    
    try {
      const requiredFieldsStr = form.getFieldValue('required_fields')
      const schemaStr = form.getFieldValue('schema')
      
      const requiredFields = this.parseMultiLineField(requiredFieldsStr)
      const schema = this.parseJSON(schemaStr, 'Schema格式错误，请检查JSON格式')
      
      message.loading({ content: '正在验证数据...', key: 'execute' })
      
      const result = await dataApi.validate(
        sourceResult!.data,
        schema,
        requiredFields
      )
      
      if (result.valid) {
        message.success({ content: result.message, key: 'execute' })
      } else {
        message.warning({ content: result.message, key: 'execute' })
      }
      
      // 合并结果：保留上游数据，添加验证结果
      const updatedResult: ParsedFile = {
        ...sourceResult!,
        validation: {
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
        },
      } as ParsedFile
      
      setExecutionResult(updatedResult)
      
      return { success: true, result: updatedResult }
    } catch (error: any) {
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

