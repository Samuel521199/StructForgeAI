/**
 * Gemini Agent 节点执行器
 * 支持 Google Gemini API 完整特性
 */
import React from 'react'
import { message } from 'antd'
import { BaseExecutor, type ExecutorResult } from './BaseExecutor'
import { geminiAgentApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class GeminiAgentExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    try {
      const config = this.context.form.getFieldsValue()
      const fullConfig = config.config || {}
      
      // 1. 验证必需配置
      const apiKey = fullConfig.api_key || config.api_key
      if (!apiKey || !apiKey.trim()) {
        return {
          success: false,
          error: '缺少 API Key：请配置 Google Gemini API Key',
        }
      }

      const apiUrl = fullConfig.api_url || config.api_url || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
      const model = fullConfig.model || config.model || 'gemini-pro'

      // 2. 获取输入数据（来自上游节点）
      const inputData = this.getSourceResult()
      const hasInputData = inputData && (
        inputData.hasData === true || 
        (inputData.data !== undefined && inputData.data !== null) ||
        (inputData.analysis !== undefined && inputData.analysis !== null) ||
        (inputData.file_path !== undefined && inputData.file_path !== null)
      )

      // 3. 构建输入内容
      const inputContent = fullConfig.input_content || []
      const inputText = fullConfig.input || config.input
      
      // 如果没有配置输入内容，从上游数据构建
      let finalInputContent = inputContent
      if (!finalInputContent || finalInputContent.length === 0) {
        if (inputText) {
          // 使用用户输入的文本
          finalInputContent = [{
            type: 'input_text',
            text: inputText,
          }]
        } else if (hasInputData && inputData) {
          // 从上游数据构建
          const dataText = JSON.stringify(inputData, null, 2)
          finalInputContent = [{
            type: 'input_text',
            text: `请分析以下数据：\n\n${dataText}`,
          }]
        }
      }

      // 4. 构建请求数据
      const requestData: any = {
        api_key: apiKey,
        api_url: apiUrl,
        model: model,
        system_prompt: fullConfig.system_prompt || config.system_prompt,
        instructions: fullConfig.instructions || config.instructions,
        input_content: finalInputContent,
        temperature: fullConfig.temperature || config.temperature || 0.7,
        max_tokens: fullConfig.max_tokens || config.max_tokens,
        output_format: fullConfig.output_format || config.output_format || 'json',
        timeout: fullConfig.timeout || config.timeout || 60,
        max_retries: fullConfig.max_retries || config.max_retries || 3,
      }

      // 添加数据处理配置（如果有上游数据）
      if (hasInputData && inputData) {
        requestData.input_data = inputData
        requestData.data_processing_mode = fullConfig.data_processing_mode || 'smart'
        requestData.data_limit_count = fullConfig.data_limit_count
        requestData.max_data_tokens = fullConfig.max_data_tokens
        requestData.sample_strategy = fullConfig.sample_strategy || 'head_tail'
      }

      message.loading({ content: 'Gemini Agent 正在处理...', key: 'gemini_agent_execute' })

      // 5. 调用后端 API
      const response = await geminiAgentApi.execute(requestData)

      if (!response.success || !response.data) {
        const errorMessage = response.message || 'Gemini Agent 执行失败'
        message.error({ content: errorMessage, key: 'gemini_agent_execute' })
        return {
          success: false,
          error: errorMessage,
        }
      }

      // 6. 更新执行结果
      const result: ParsedFile = response.data

      this.context.setExecutionResult(result)

      message.success({ 
        content: 'Gemini Agent 执行成功', 
        key: 'gemini_agent_execute',
        duration: 3
      })

      return {
        success: true,
        message: 'Gemini Agent 执行成功',
        result,
      }
    } catch (error: any) {
      console.error('[GeminiAgentExecutor] 执行失败:', error)
      
      // 检查错误信息
      const errorMessage = error.message || error.response?.data?.detail || ''
      let errorJson: any = {}
      
      try {
        errorJson = typeof errorMessage === 'string' ? JSON.parse(errorMessage) : errorMessage
      } catch {
        // 如果不是 JSON，尝试从错误消息中提取信息
        if (errorMessage.includes('API Key') || errorMessage.includes('认证')) {
          errorJson = { error_type: 'authentication_error' }
        }
      }

      // 检查错误类型
      const errorType = errorJson.error_type || ''
      const statusCode = error.response?.status || errorJson.status_code
      const errorDetail = errorJson.error_detail || errorJson.error_message || errorMessage
      const suggestion = errorJson.suggestion || ''

      // 对于认证错误，显示友好的错误提示
      if (errorType === 'authentication_error' || statusCode === 401) {
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                {errorJson.error_message || 'API 认证失败'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {errorDetail}
              </div>
              {suggestion && (
                <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 8 }}>
                  {suggestion}
                </div>
              )}
            </div>
          ),
          duration: 10,
        })
        return {
          success: false,
          error: errorJson.error_message || 'API 认证失败',
        }
      }

      // 对于其他错误，显示友好的错误提示
      message.error({
        content: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              {errorJson.error_message || 'Gemini Agent 执行失败'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {errorDetail}
            </div>
            {suggestion && (
              <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 8 }}>
                {suggestion}
              </div>
            )}
          </div>
        ),
        duration: 10,
      })
      
      return {
        success: false,
        error: errorJson.error_message || `Gemini Agent 执行失败: ${error.message || String(error)}`,
      }
    }
  }
}

