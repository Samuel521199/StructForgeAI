/**
 * Google Gemini 节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { chatModelApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class GeminiExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    
    const sourceResult = this.getSourceResult()
    
    try {
      const apiKey = form.getFieldValue('api_key')
      let apiUrl = form.getFieldValue('api_url')
      const model = form.getFieldValue('model') || 'gemini-pro'
      const requestHeaders = form.getFieldValue('request_headers')
      const requestBody = form.getFieldValue('request_body')
      const timeout = form.getFieldValue('timeout') || 60
      const maxRetries = form.getFieldValue('max_retries') || 3
      
      // 获取 prompt
      let prompt = form.getFieldValue('prompt')
      if (!prompt || prompt.trim() === '') {
        if (sourceResult) {
          if (sourceResult.analysis) {
            prompt = `请分析以下数据：\n${JSON.stringify(sourceResult.analysis, null, 2)}`
          } else if (sourceResult.data) {
            prompt = `请处理以下数据：\n${JSON.stringify(sourceResult.data, null, 2)}`
          } else {
            prompt = 'Hello, please help me.'
          }
        } else {
          prompt = 'Hello, please help me.'
        }
      }
      
      // 验证必需字段
      if (!apiKey || apiKey.trim() === '') {
        return { success: false, error: '请输入 API Key' }
      }
      if (!apiUrl || apiUrl.trim() === '') {
        return { success: false, error: '请输入 API 地址' }
      }
      if (!requestBody || requestBody.trim() === '') {
        return { success: false, error: '请配置请求体（JSON格式）' }
      }
      
      // Gemini API Key 需要作为 URL 参数
      if (!apiUrl.includes('${API_KEY}') && !apiUrl.includes('key=')) {
        const separator = apiUrl.includes('?') ? '&' : '?'
        apiUrl = `${apiUrl}${separator}key=${apiKey}`
      }
      
      // 验证 JSON 格式
      try {
        if (requestHeaders && requestHeaders.trim() !== '') {
          JSON.parse(requestHeaders)
        }
        JSON.parse(requestBody)
      } catch (e) {
        return { success: false, error: '请求头或请求体的 JSON 格式错误，请检查配置' }
      }
      
      message.loading({ 
        content: `正在调用 Gemini (${model})...`, 
        key: 'execute',
        duration: 0
      })
      
      const result = await chatModelApi.chat({
        model_type: 'gemini',
        api_key: apiKey,
        api_url: apiUrl,
        request_headers: requestHeaders,
        request_body: requestBody,
        prompt: prompt,
        timeout: timeout,
        max_retries: maxRetries,
      })
      
      const updatedResult: ParsedFile = {
        ...(sourceResult || {
          hasData: false,
          hasSchema: false,
          hasAnalysis: false,
        }),
        chat_model_response: {
          model: result.model,
          content: result.content,
          usage: result.usage,
          raw_response: result.raw_response,
          prompt: prompt,
          model_type: 'gemini',
        },
      }
      
      setExecutionResult(updatedResult)
      message.success({ 
        content: `Gemini (${model}) 调用成功`, 
        key: 'execute',
        duration: 3
      })
      
      return { success: true, result: updatedResult }
    } catch (error: any) {
      this.handleError(error)
      return { success: false, error: this.extractErrorMessage(error) }
    }
  }
}

