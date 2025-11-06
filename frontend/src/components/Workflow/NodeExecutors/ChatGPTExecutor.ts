/**
 * ChatGPT 节点执行器
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { chatModelApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class ChatGPTExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    
    // ChatGPT 节点可以独立使用，也可以从上游节点获取 prompt
    const sourceResult = this.getSourceResult()
    
    try {
      // 获取配置
      const apiKey = form.getFieldValue('api_key')
      const apiUrl = form.getFieldValue('api_url')
      const model = form.getFieldValue('model') || 'gpt-3.5-turbo'
      const requestHeaders = form.getFieldValue('request_headers')
      const requestBody = form.getFieldValue('request_body')
      const timeout = form.getFieldValue('timeout') || 60
      const maxRetries = form.getFieldValue('max_retries') || 3
      
      // 获取 prompt（优先从表单，如果没有则从上游节点数据）
      let prompt = form.getFieldValue('prompt')
      
      // 如果没有配置 prompt，尝试从上游节点数据中提取
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
      
      // 如果请求体中没有 model，自动添加
      // 同时确保 messages 数组格式正确
      try {
        const bodyObj = JSON.parse(requestBody)
        if (!bodyObj.model) {
          bodyObj.model = model
        }
        // 确保 messages 数组存在且格式正确
        if (!bodyObj.messages || !Array.isArray(bodyObj.messages)) {
          bodyObj.messages = [{ role: 'user', content: '${PROMPT}' }]
        }
        // 如果 temperature 在表单中配置了，添加到请求体
        const temperature = form.getFieldValue('temperature')
        if (temperature !== undefined && temperature !== null) {
          bodyObj.temperature = temperature
        }
        form.setFieldValue('request_body', JSON.stringify(bodyObj, null, 2))
      } catch (e) {
        // 忽略 JSON 解析错误，会在后面验证
      }
      
      // 验证 JSON 格式
      try {
        if (requestHeaders && requestHeaders.trim() !== '') {
          JSON.parse(requestHeaders)
        }
        JSON.parse(form.getFieldValue('request_body'))
      } catch (e) {
        return { success: false, error: '请求头或请求体的 JSON 格式错误，请检查配置' }
      }
      
      message.loading({ 
        content: `正在调用 ChatGPT (${model})...`, 
        key: 'execute',
        duration: 0
      })
      
      // 调用 Chat Model API
      const result = await chatModelApi.chat({
        model_type: 'chatgpt',
        api_key: apiKey,
        api_url: apiUrl,
        request_headers: requestHeaders,
        request_body: form.getFieldValue('request_body'),
        prompt: prompt,
        timeout: timeout,
        max_retries: maxRetries,
      })
      
      // 合并结果：保留上游数据（如果有），添加 ChatGPT 响应
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
          model_type: 'chatgpt',
        },
      }
      
      setExecutionResult(updatedResult)
      message.success({ 
        content: `ChatGPT (${model}) 调用成功`, 
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

