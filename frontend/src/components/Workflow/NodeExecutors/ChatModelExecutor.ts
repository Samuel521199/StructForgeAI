/**
 * Chat Model 节点执行器
 * 支持 DeepSeek、ChatGPT、Gemini 等自定义 AI 模型
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorContext, type ExecutorResult } from './BaseExecutor'
import { chatModelApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class ChatModelExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    const { form, setExecutionResult } = this.context
    
    // Chat Model 节点可以独立使用，也可以从上游节点获取 prompt
    const sourceResult = this.getSourceResult()
    
    try {
      // 获取配置
      const modelType = form.getFieldValue('model_type')
      const apiKey = form.getFieldValue('api_key')
      const apiUrl = form.getFieldValue('api_url')
      const requestHeaders = form.getFieldValue('request_headers')
      const requestBody = form.getFieldValue('request_body')
      const timeout = form.getFieldValue('timeout') || 60
      const maxRetries = form.getFieldValue('max_retries') || 3
      
      // 获取 prompt（优先从表单，如果没有则从上游节点数据）
      let prompt = form.getFieldValue('prompt')
      
      // 如果没有配置 prompt，尝试从上游节点数据中提取
      if (!prompt || prompt.trim() === '') {
        if (sourceResult) {
          // 尝试从上游数据中提取文本内容
          if (sourceResult.analysis) {
            // 如果上游是 AI 分析结果，使用分析结果作为 prompt 上下文
            prompt = `请分析以下数据：\n${JSON.stringify(sourceResult.analysis, null, 2)}`
          } else if (sourceResult.data) {
            // 如果上游是解析的数据，使用数据作为 prompt 上下文
            prompt = `请处理以下数据：\n${JSON.stringify(sourceResult.data, null, 2)}`
          } else {
            // 如果都没有，使用默认 prompt
            prompt = 'Hello, please help me.'
          }
        } else {
          // 如果没有上游数据，使用默认 prompt
          prompt = 'Hello, please help me.'
        }
      }
      
      // 验证必需字段
      if (!modelType) {
        return { success: false, error: '请选择模型类型' }
      }
      if (!apiKey || apiKey.trim() === '') {
        return { success: false, error: '请输入 API Key' }
      }
      if (!apiUrl || apiUrl.trim() === '') {
        return { success: false, error: '请输入 API 地址' }
      }
      if (!requestBody || requestBody.trim() === '') {
        return { success: false, error: '请配置请求体（JSON格式）' }
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
        content: `正在调用 ${modelType} 模型...`, 
        key: 'execute',
        duration: 0  // 不自动关闭
      })
      
      // 调用 Chat Model API
      const result = await chatModelApi.chat({
        model_type: modelType,
        api_key: apiKey,
        api_url: apiUrl,
        request_headers: requestHeaders,
        request_body: requestBody,
        prompt: prompt,
        timeout: timeout,
        max_retries: maxRetries,
      })
      
      // 合并结果：保留上游数据（如果有），添加 Chat Model 响应
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
          model_type: modelType,
        },
      }
      
      setExecutionResult(updatedResult)
      message.success({ 
        content: `${modelType} 模型调用成功`, 
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

