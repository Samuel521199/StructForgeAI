/**
 * 导出文件节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { fileApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class ExportFileExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    
    // 获取配置
    const config = form.getFieldsValue()
    const fullConfig = config.config || {}
    const outputPath = fullConfig.output_path || config.output_path
    const outputFormat = fullConfig.output_format || config.output_format || 'xml'
    const prettyPrint = fullConfig.pretty_print !== false // 默认 true
    const sortBy = fullConfig.sort_by || config.sort_by
    
    // 获取输入数据（来自上游节点）
    const inputData = this.getSourceResult()
    
    if (!inputData || !inputData.data) {
      message.error('没有可导出的数据，请先执行上游节点')
      return { success: false, error: '没有可导出的数据' }
    }
    
    try {
      message.loading({ content: `正在导出为 ${outputFormat.toUpperCase()} 格式...`, key: 'execute' })
      
      console.log('[ExportFileExecutor] 准备导出文件:', {
        outputPath,
        outputFormat,
        prettyPrint,
        sortBy,
        hasData: !!inputData.data,
      })
      
      // 提取文件名（如果有路径）
      let filename: string | undefined = undefined
      if (outputPath) {
        const pathParts = outputPath.split(/[/\\]/)
        const fileNameWithExt = pathParts[pathParts.length - 1]
        if (fileNameWithExt.includes('.')) {
          filename = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.'))
        } else {
          filename = fileNameWithExt
        }
      }
      
      // 调用后端 API 导出文件
      const blob = await fileApi.export(
        inputData.data,
        outputFormat,
        filename,
        prettyPrint,
        sortBy
      )
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ? `${filename}.${outputFormat}` : `export_${Date.now()}.${outputFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('[ExportFileExecutor] 文件导出成功')
      
      // 构建执行结果
      const executionResult: ParsedFile = {
        hasData: true,
        data: inputData.data, // 保留原始数据
        file_path: outputPath || link.download,
        output_format: outputFormat,
        exported: true,
        export_path: link.download,
      }
      
      setExecutionResult(executionResult)
      
      message.success({ 
        content: `文件已导出: ${link.download}`, 
        key: 'execute',
        duration: 5
      })
      
      return {
        success: true,
        message: '文件导出成功',
        result: executionResult,
      }
    } catch (error: any) {
      console.error('[ExportFileExecutor] 文件导出失败:', error)
      const errorMessage = error.message || '文件导出失败'
      message.error({ content: errorMessage, key: 'execute' })
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

