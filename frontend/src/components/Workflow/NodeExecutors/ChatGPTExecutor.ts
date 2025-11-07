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
      const model = form.getFieldValue('model') || 'gpt-5-nano'
      const requestHeaders = form.getFieldValue('request_headers')
      let requestBody = form.getFieldValue('request_body')
      const timeout = form.getFieldValue('timeout') || 60
      const maxRetries = form.getFieldValue('max_retries') || 3
      
      // 获取输入模式和相关参数
      const inputMode = form.getFieldValue('input_mode') || 'simple'
      const inputText = form.getFieldValue('input')
      const instructions = form.getFieldValue('instructions')
      const reasoningEnabled = form.getFieldValue('reasoning_enabled')
      const reasoningEffort = form.getFieldValue('reasoning_effort')
      const promptId = form.getFieldValue('prompt_id')
      const promptVersion = form.getFieldValue('prompt_version')
      const promptVariables = form.getFieldValue('prompt_variables')
      const temperature = form.getFieldValue('temperature')
      const maxTokens = form.getFieldValue('max_tokens')
      
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
      
      // 构建请求体（支持 Responses API 格式）
      try {
        const bodyObj = JSON.parse(requestBody)
        
        // 确保 model 存在
        if (!bodyObj.model) {
          bodyObj.model = model
        }
        
        // 处理 input 参数
        if (inputMode === 'simple') {
          // 简单文本模式
          if (inputText && inputText.trim() !== '') {
            // 替换 ${PROMPT} 变量
            bodyObj.input = inputText.replace(/\$\{PROMPT\}/g, prompt)
          } else {
            bodyObj.input = prompt
          }
        } else {
          // 消息数组模式
          const messages = form.getFieldValue('messages') || []
          if (Array.isArray(messages) && messages.length > 0) {
            // 构建消息数组，替换变量
            bodyObj.input = messages.map((msg: any) => ({
              role: msg.role || 'user',
              content: msg.content
                .replace(/\$\{PROMPT\}/g, prompt)
                .replace(/\$\{INSTRUCTIONS\}/g, instructions || '')
            }))
          } else {
            // 如果没有配置消息，使用默认格式
            bodyObj.input = [
              ...(instructions ? [{ role: 'developer', content: instructions }] : []),
              { role: 'user', content: prompt }
            ]
          }
        }
        
        // 添加 instructions 参数（如果配置了）
        if (instructions && instructions.trim() !== '') {
          bodyObj.instructions = instructions
        }
        
        // 添加 reasoning 参数（如果启用了推理模式）
        if (reasoningEnabled) {
          bodyObj.reasoning = {
            effort: reasoningEffort || 'low'
          }
        }
        
        // 添加 prompt 参数（如果配置了可重用提示词模板）
        if (promptId && promptId.trim() !== '') {
          bodyObj.prompt = {
            id: promptId,
            ...(promptVersion ? { version: promptVersion } : {}),
            ...(promptVariables ? { variables: JSON.parse(promptVariables) } : {})
          }
        }
        
        // 添加 temperature（如果配置了）
        // 注意：OpenAI Responses API 不支持 max_tokens 参数
        if (temperature !== undefined && temperature !== null) {
          bodyObj.temperature = temperature
        }
        // 移除 max_tokens，因为 Responses API 不支持此参数
        // if (maxTokens !== undefined && maxTokens !== null) {
        //   bodyObj.max_tokens = maxTokens
        // }
        
        // 更新请求体
        requestBody = JSON.stringify(bodyObj, null, 2)
        form.setFieldValue('request_body', requestBody)
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

