/**
 * GPT Agent 节点执行器
 * 合并 AIAgent 和 ChatModel 功能，支持 ChatGPT Responses API 完整特性
 */
import React from 'react'
import { message, Modal } from 'antd'
import { BaseExecutor, type ExecutorResult } from './BaseExecutor'
import { gptAgentApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class GPTAgentExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    try {
      const config = this.context.form.getFieldsValue()
      const fullConfig = config.config || {}
      
      // 1. 验证必需配置
      const apiKey = fullConfig.api_key || config.api_key
      if (!apiKey || !apiKey.trim()) {
        return {
          success: false,
          error: '缺少 API Key：请配置 OpenAI API Key',
        }
      }

      const apiUrl = fullConfig.api_url || config.api_url || 'https://api.openai.com/v1/responses'
      const model = fullConfig.model || config.model || 'gpt-5'

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

      // 4. 处理文件上传（如果有）
      let fileId: string | undefined = undefined
      if (fullConfig.file_path || config.file_path) {
        const filePath = fullConfig.file_path || config.file_path
        // 注意：这里假设文件已经上传，file_path 是本地路径
        // 实际应该先上传文件获取 file_id
        // TODO: 实现文件上传逻辑
      }

      // 5. 构建请求数据
      const requestData: any = {
        api_key: apiKey,
        api_url: apiUrl,
        model: model,
        system_prompt: fullConfig.system_prompt || config.system_prompt,
        instructions: fullConfig.instructions || config.instructions,
        reasoning: fullConfig.reasoning || config.reasoning,
        input_content: finalInputContent,
        file_path: fullConfig.file_path || config.file_path,
        file_purpose: fullConfig.file_purpose || config.file_purpose || 'user_data',
        temperature: fullConfig.temperature || config.temperature || 0.7,
        max_tokens: fullConfig.max_tokens || config.max_tokens,
        output_format: fullConfig.output_format || config.output_format || 'json',
        timeout: fullConfig.timeout || config.timeout || 60,
        max_retries: fullConfig.max_retries || config.max_retries || 3,
        request_headers: fullConfig.request_headers || config.request_headers,
      }

      // 添加 MCP 服务器配置
      if (fullConfig.mcp_servers && fullConfig.mcp_servers.length > 0) {
        requestData.mcp_servers = fullConfig.mcp_servers
      }

      // 添加 Agent 配置（多 Agent 协作）
      if (fullConfig.agents && fullConfig.agents.length > 0) {
        requestData.agents = fullConfig.agents
        requestData.agent_handoffs = fullConfig.agent_handoffs
      }

      // 添加数据处理配置（如果有上游数据）
      if (hasInputData && inputData) {
        requestData.input_data = inputData
        requestData.data_processing_mode = fullConfig.data_processing_mode || 'smart'
        requestData.data_limit_count = fullConfig.data_limit_count
        requestData.max_data_tokens = fullConfig.max_data_tokens
        requestData.sample_strategy = fullConfig.sample_strategy || 'head_tail'
      }

      // 添加 Memory 配置（如果连接了 Memory 节点）
      const useMemory = fullConfig.use_memory === true
      const memoryConnected = fullConfig.memory_connected === true
      if (useMemory && memoryConnected) {
        requestData.use_memory = true
        requestData.memory_connected = true
        requestData.memory_config = {
          memory_type: fullConfig.memory_config?.memory_type || 'workflow',
          memory_strategy: fullConfig.memory_config?.memory_strategy || 'auto',
          memory_ttl: fullConfig.memory_config?.memory_ttl || 0,
        }
      }

      // 添加 Tool 配置（如果连接了 Tool 节点）
      const useTool = fullConfig.use_tool === true
      const toolConnected = fullConfig.tool_connected === true
      if (useTool && toolConnected) {
        requestData.use_tool = true
        requestData.tool_connected = true
        requestData.tool_config = {
          tool_type: fullConfig.tool_config?.tool_type || 'code',
          tool_functions: fullConfig.tool_config?.tool_functions || [],
        }
        
        // 如果连接了 Tool 节点，尝试从连接的节点获取工具函数列表
        if (this.context.getConnectedNode) {
          const toolNodeInfo = this.context.getConnectedNode('', 'tool')
          if (toolNodeInfo && toolNodeInfo.node) {
            const toolNodeConfig = toolNodeInfo.node.data?.config || {}
            // 从 Tool 节点配置中提取工具函数
            if (toolNodeConfig.functions || toolNodeConfig.tool_functions) {
              requestData.tool_config.tool_functions = toolNodeConfig.functions || toolNodeConfig.tool_functions
            }
          }
        }
      }

      message.loading({ content: 'GPT Agent 正在处理...', key: 'gpt_agent_execute' })

      // 6. 调用后端 API
      let response: any
      try {
        response = await gptAgentApi.execute(requestData)
      } catch (error: any) {
        // 检查是否是配额错误
        // 错误信息可能来自响应拦截器，格式为字符串或 JSON
        const errorMessage = error.message || error.response?.data?.detail || ''
        let errorJson: any = {}
        
        try {
          // 尝试解析 JSON 格式的错误信息
          errorJson = typeof errorMessage === 'string' ? JSON.parse(errorMessage) : errorMessage
        } catch {
          // 如果不是 JSON，检查错误消息中是否包含配额相关信息
          if (errorMessage.includes('insufficient_quota') || errorMessage.includes('配额')) {
            errorJson = { error_type: 'insufficient_quota' }
          }
        }

        // 检查状态码或错误类型
        if (
          errorJson.error_type === 'insufficient_quota' || 
          error.response?.status === 429 ||
          errorMessage.includes('insufficient_quota') ||
          errorMessage.includes('配额')
        ) {
          // 配额不足，显示对话框
          return await this.handleQuotaError(model, requestData)
        }
        
        // 其他错误，正常处理
        throw error
      }

      if (!response.success || !response.data) {
        const errorMessage = response.message || 'GPT Agent 执行失败'
        
        // 检查是否是配额错误
        try {
          const errorJson = typeof errorMessage === 'string' ? JSON.parse(errorMessage) : errorMessage
          if (errorJson.error_type === 'insufficient_quota') {
            return await this.handleQuotaError(model, requestData)
          }
        } catch {
          // 不是 JSON 格式，检查是否包含配额相关信息
          if (errorMessage.includes('insufficient_quota') || errorMessage.includes('配额')) {
            return await this.handleQuotaError(model, requestData)
          }
        }
        
        message.error({ content: errorMessage, key: 'gpt_agent_execute' })
        return {
          success: false,
          error: errorMessage,
        }
      }

      // 7. 更新执行结果
      const result: ParsedFile = response.data

      this.context.setExecutionResult(result)

      message.success({ 
        content: 'GPT Agent 执行成功', 
        key: 'gpt_agent_execute',
        duration: 3
      })

      return {
        success: true,
        message: 'GPT Agent 执行成功',
        result,
      }
    } catch (error: any) {
      console.error('[GPTAgentExecutor] 执行失败:', error)
      
      // 检查错误信息
      const errorMessage = error.message || error.response?.data?.detail || ''
      let errorJson: any = {}
      
      try {
        errorJson = typeof errorMessage === 'string' ? JSON.parse(errorMessage) : errorMessage
      } catch {
        // 如果不是 JSON，尝试从错误消息中提取信息
        if (errorMessage.includes('insufficient_quota') || errorMessage.includes('配额')) {
          errorJson = { error_type: 'insufficient_quota' }
        } else if (errorMessage.includes('invalid_api_key') || errorMessage.includes('API Key')) {
          errorJson = { error_type: 'invalid_api_key' }
        } else if (errorMessage.includes('rate_limit') || errorMessage.includes('频率')) {
          errorJson = { error_type: 'rate_limit' }
        }
      }

      // 检查错误类型
      const errorType = errorJson.error_type || ''
      const statusCode = error.response?.status || errorJson.status_code
      const errorDetail = errorJson.error_detail || errorJson.error_message || errorMessage
      const suggestion = errorJson.suggestion || ''

      // 对于需要特殊处理的错误类型
      const isQuotaError = (
        errorType === 'insufficient_quota' || 
        statusCode === 429 && errorType === 'insufficient_quota'
      )
      
      const isModelNotFoundError = (
        errorType === 'model_not_found' ||
        statusCode === 404 ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('模型不存在')
      )

      const isAuthError = (
        errorType === 'invalid_api_key' ||
        errorType === 'authentication_error' ||
        errorType === 'organization_required' ||
        errorType === 'ip_not_authorized' ||
        statusCode === 401
      )

      // 对于配额错误或模型不存在错误，显示降级对话框
      if (isQuotaError || isModelNotFoundError) {
        const config = this.context.form.getFieldsValue()
        const fullConfig = config.config || {}
        const currentModel = fullConfig.model || config.model || 'gpt-5'
        const excludedModels = isModelNotFoundError ? [currentModel] : []
        return await this.handleQuotaError(currentModel, null, excludedModels)
      }

      // 对于认证错误，显示友好的错误提示
      if (isAuthError) {
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
              {errorJson.error_message || 'GPT Agent 执行失败'}
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
        error: errorJson.error_message || `GPT Agent 执行失败: ${error.message || String(error)}`,
      }
    }
  }

  /**
   * 处理配额不足错误
   * 显示对话框，让用户选择充值或降级模型
   * @param currentModel 当前使用的模型
   * @param requestData 请求数据（如果存在，可以重新执行）
   * @param excludedModels 已尝试但不可用的模型列表
   */
  private async handleQuotaError(
    currentModel: string,
    requestData: any,
    excludedModels: string[] = []
  ): Promise<ExecutorResult> {
    return new Promise((resolve) => {
      // 更新可用模型列表，移除已知不可用的模型
      // gpt-4 在某些账户中可能不可用，所以从默认列表中移除
      const allModels = [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '最便宜的模型，速度快，适合简单任务' },
        { value: 'gpt-4o', label: 'GPT-4o', description: '高性能模型，性价比高，推荐使用' },
        // 注意：gpt-4 和 gpt-3.5-turbo 可能在某些账户中不可用，但保留在列表中供用户尝试
        { value: 'gpt-4', label: 'GPT-4', description: '经典 GPT-4 模型，性能稳定（可能不可用）' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '经济实惠，适合基础任务（可能不可用）' },
      ]
      
      // 过滤掉已尝试但不可用的模型
      const availableModels = allModels.filter(model => !excludedModels.includes(model.value))
      
      // 如果没有可用模型，显示错误
      if (availableModels.length === 0) {
        Modal.error({
          title: '没有可用的模型',
          content: '所有降级模型都不可用，请充值账户或检查 API 访问权限。',
          okText: '去充值',
          onOk: () => {
            window.open('https://platform.openai.com/account/billing', '_blank')
            resolve({
              success: false,
              error: '没有可用的模型，请充值后重试',
            })
          },
        })
        return
      }

      Modal.confirm({
        title: 'API 配额不足',
        width: 600,
        content: (
          <div style={{ marginTop: 16 }}>
            <p style={{ marginBottom: 16 }}>
              您的 OpenAI API 配额已用完，无法使用 <strong>{currentModel}</strong> 模型。
            </p>
            <p style={{ marginBottom: 16, color: '#666' }}>
              请选择以下操作之一：
            </p>
            <div style={{ marginBottom: 16 }}>
              <p><strong>选项 1：充值账户</strong></p>
              <p style={{ marginLeft: 20, color: '#666', fontSize: '12px' }}>
                访问 OpenAI 账户页面充值后继续使用当前模型
              </p>
            </div>
            <div>
              <p><strong>选项 2：降级使用更便宜的模型</strong></p>
              <p style={{ marginLeft: 20, color: '#666', fontSize: '12px', marginBottom: 8 }}>
                选择以下模型之一，系统将自动更新配置并重新执行：
              </p>
              <ul style={{ marginLeft: 40, color: '#666', fontSize: '12px' }}>
                {availableModels.map((model) => (
                  <li key={model.value}>
                    <strong>{model.label}</strong>: {model.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ),
        okText: '降级使用更便宜的模型',
        cancelText: '去充值',
        onOk: () => {
          // 显示模型选择对话框
          Modal.confirm({
            title: '选择降级模型',
            width: 500,
            content: (
              <div style={{ marginTop: 16 }}>
                <p style={{ marginBottom: 16 }}>
                  请选择要使用的模型（按价格从低到高排序）：
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {availableModels.map((model) => (
                    <div
                      key={model.value}
                      style={{
                        padding: '12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                      }}
                      onClick={() => {
                        // 更新节点配置
                        const config = this.context.form.getFieldsValue()
                        const fullConfig = config.config || {}
                        
                        // 更新模型配置
                        this.context.form.setFieldsValue({
                          config: {
                            ...fullConfig,
                            model: model.value,
                          },
                        })
                        
                        // 关闭对话框
                        Modal.destroyAll()
                        
                        message.info({
                          content: `已切换到 ${model.label}，正在重新执行...`,
                          key: 'gpt_agent_execute',
                          duration: 3,
                        })
                        
                        // 重新执行
                        if (requestData) {
                          requestData.model = model.value
                          // 递归调用 execute，但使用新的模型
                          this.executeWithModel(model.value, requestData).then(resolve)
                        } else {
                          // 如果没有 requestData，直接执行
                          this.execute().then(resolve)
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1890ff'
                        e.currentTarget.style.backgroundColor = '#f0f8ff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d9d9d9'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {model.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {model.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
            okText: '取消',
            cancelText: '取消',
            onOk: () => {
              Modal.destroyAll()
              resolve({
                success: false,
                error: '用户取消了操作',
              })
            },
            onCancel: () => {
              Modal.destroyAll()
              resolve({
                success: false,
                error: '用户取消了操作',
              })
            },
          })
        },
        onCancel: () => {
          // 打开充值页面
          window.open('https://platform.openai.com/account/billing', '_blank')
          message.info({
            content: '已打开 OpenAI 账户页面，充值后请重新执行节点',
            key: 'gpt_agent_execute',
            duration: 5,
          })
          resolve({
            success: false,
            error: 'API 配额不足，请充值后重试',
          })
        },
      })
    })
  }

  /**
   * 使用指定模型重新执行
   */
  private async executeWithModel(
    model: string,
    requestData: any
  ): Promise<ExecutorResult> {
    try {
      // 更新模型
      requestData.model = model
      
      message.loading({ content: `使用 ${model} 重新执行...`, key: 'gpt_agent_execute' })

      const response = await gptAgentApi.execute(requestData)

      if (!response.success || !response.data) {
        const errorMessage = response.message || 'GPT Agent 执行失败'
        
        // 检查是否是模型不存在或配额错误
        const errorDetail = errorMessage
        let errorJson: any = {}
        try {
          errorJson = typeof errorDetail === 'string' ? JSON.parse(errorDetail) : errorDetail
        } catch {
          if (errorDetail.includes('does not exist') || errorDetail.includes('not have access')) {
            errorJson = { error_type: 'model_not_found' }
          } else if (errorDetail.includes('insufficient_quota') || errorDetail.includes('配额')) {
            errorJson = { error_type: 'insufficient_quota' }
          }
        }

        // 如果模型不存在或配额不足，再次显示对话框
        if (errorJson.error_type === 'model_not_found' || errorJson.error_type === 'insufficient_quota') {
          message.warning({ 
            content: `模型 ${model} 不可用，请选择其他模型`, 
            key: 'gpt_agent_execute',
            duration: 3
          })
          // 再次显示对话框，但排除已尝试的模型
          return await this.handleQuotaError(model, requestData, [model])
        }
        
        message.error({ content: errorMessage, key: 'gpt_agent_execute' })
        return {
          success: false,
          error: errorMessage,
        }
      }

      // 更新执行结果
      const result: ParsedFile = response.data
      this.context.setExecutionResult(result)

      message.success({ 
        content: `GPT Agent 执行成功（使用 ${model}）`, 
        key: 'gpt_agent_execute',
        duration: 3
      })

      return {
        success: true,
        message: `GPT Agent 执行成功（使用 ${model}）`,
        result,
      }
    } catch (error: any) {
      console.error('[GPTAgentExecutor] 重新执行失败:', error)
      
      // 检查是否是模型不存在或配额错误
      const errorMessage = error.message || error.response?.data?.detail || ''
      let errorJson: any = {}
      try {
        errorJson = typeof errorMessage === 'string' ? JSON.parse(errorMessage) : errorMessage
      } catch {
        if (errorMessage.includes('does not exist') || errorMessage.includes('not have access')) {
          errorJson = { error_type: 'model_not_found' }
        } else if (errorMessage.includes('insufficient_quota') || errorMessage.includes('配额')) {
          errorJson = { error_type: 'insufficient_quota' }
        }
      }

      // 如果模型不存在或配额不足，再次显示对话框
      if (errorJson.error_type === 'model_not_found' || errorJson.error_type === 'insufficient_quota') {
        message.warning({ 
          content: `模型 ${model} 不可用，请选择其他模型`, 
          key: 'gpt_agent_execute',
          duration: 3
        })
        // 获取已排除的模型列表（从 requestData 或其他地方）
        // 这里我们需要追踪已尝试的模型
        const excludedModels: string[] = []
        // 尝试从 requestData 中获取已排除的模型列表
        if (requestData._excludedModels) {
          excludedModels.push(...requestData._excludedModels)
        }
        excludedModels.push(model)
        requestData._excludedModels = excludedModels
        
        return await this.handleQuotaError(model, requestData, excludedModels)
      }
      
      return {
        success: false,
        error: `GPT Agent 执行失败: ${error.message || String(error)}`,
      }
    }
  }
}

