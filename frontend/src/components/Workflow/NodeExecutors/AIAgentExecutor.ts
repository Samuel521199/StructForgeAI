/**
 * AI Agent 节点执行器
 * 
 * 架构原则：前端只负责显示和用户操作的传达，所有计算都在后端完成
 * - 前端职责：收集配置、收集数据、调用后端API、更新UI状态
 * - 后端职责：构建提示词、调用Chat Model、处理输出等所有计算逻辑
 */
import { message } from 'antd'
import { BaseExecutor, type ExecutorResult } from './BaseExecutor'
import { aiWorkflowApi } from '@/services/api'
import type { ParsedFile } from '@/types'

export class AIAgentExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    try {
      // ========== 前端职责：收集配置和数据 ==========
      
      // 1. 验证必需配置
      const config = this.context.form.getFieldsValue()
      const systemPrompt = config.config?.system_prompt || config.system_prompt
      
      if (!systemPrompt || !systemPrompt.trim()) {
        return {
          success: false,
          error: '缺少系统提示词：请配置系统提示词',
        }
      }

      // 2. 获取输入数据（来自上游节点）
      const inputData = this.getSourceResult()
      
      // 调试：打印输入数据信息
      console.log('[AIAgentExecutor] 输入数据检查:', {
        hasInputData: !!inputData,
        hasUpstreamResult: this.context.upstreamResult !== null && this.context.upstreamResult !== undefined,
        hasExecutionResult: this.context.executionResult !== null && this.context.executionResult !== undefined,
        inputDataKeys: inputData ? Object.keys(inputData) : [],
        hasData: inputData?.hasData,
        hasDataField: inputData?.data !== undefined,
        hasAnalysis: inputData?.analysis !== undefined,
        hasFilePath: inputData?.file_path !== undefined,
      })
      
      // 检查是否有输入数据
      const hasInputData = inputData && (
        inputData.hasData === true || 
        (inputData.data !== undefined && inputData.data !== null && 
         (typeof inputData.data === 'object' ? Object.keys(inputData.data).length > 0 : true)) ||
        (inputData.analysis !== undefined && inputData.analysis !== null) ||
        (inputData.file_path !== undefined && inputData.file_path !== null)
      )
      
      if (!hasInputData) {
        // 检查是否有上游节点连接
        const hasUpstream = this.context.upstreamResult !== null && this.context.upstreamResult !== undefined
        
        // 检查上游节点是否执行失败
        if (hasUpstream && this.context.upstreamResult) {
          const upstreamResult = this.context.upstreamResult
          if (upstreamResult.error || (upstreamResult as any).executionError) {
            return {
              success: false,
              error: `上游"解析文件"节点执行失败：${upstreamResult.error || (upstreamResult as any).executionError}。请先修复上游节点的问题，然后再执行AI Agent节点。`,
            }
          }
          
          return {
            success: false,
            error: '缺少输入数据：上游"解析文件"节点已连接，但数据为空。请先执行上游"解析文件"节点（确保执行成功），然后再执行AI Agent节点。',
          }
        } else {
          return {
            success: false,
            error: '缺少输入数据：请先连接并执行上游"解析文件"节点，然后再执行AI Agent节点。\n\n执行步骤：\n1. 双击"解析文件"节点\n2. 点击"执行节点"按钮\n3. 等待执行成功\n4. 然后再执行AI Agent节点',
          }
        }
      }

      // 3. 获取AI Agent配置
      const fullConfig = config.config || {}
      const goal = fullConfig.goal as string | undefined
      const temperature = (fullConfig.temperature as number) || 0.7
      const outputFormat = (fullConfig.output_format as string) || 'json'
      const maxTokens = (fullConfig.max_tokens as number) || 2000
      const useMemory = fullConfig.use_memory === true
      const memoryConfig = useMemory ? {
        memory_type: fullConfig.memory_type || 'workflow',
        memory_strategy: fullConfig.memory_strategy || 'auto',
        memory_ttl: fullConfig.memory_ttl || 0,
      } : undefined
      
      // 数据处理配置（用于控制输入数据量，避免超过Token限制）
      const dataProcessingMode = (fullConfig.data_processing_mode as string) || 'smart'
      const dataLimitCount = fullConfig.data_limit_count as number | undefined
      const maxDataTokens = (fullConfig.max_data_tokens as number) || undefined
      const sampleStrategy = (fullConfig.sample_strategy as string) || 'head_tail'

      // 4. 获取Chat Model配置（从连接的节点获取）
      const chatModelConnected = fullConfig.chat_model_connected || false
      if (!chatModelConnected) {
        return {
          success: false,
          error: '缺少Chat Model连接：请从AI Agent节点底部的Chat Model端口（🤖）连接ChatGPT、Gemini或DeepSeek节点',
        }
      }

      if (!this.context.getConnectedNode) {
        return {
          success: false,
          error: '无法获取连接的Chat Model节点：请确保工作流图已正确加载',
        }
      }

      // 获取连接的Chat Model节点
      const chatModelNodeInfo = this.context.getConnectedNode('', 'chat_model')
      
      console.log('[AIAgentExecutor] Chat Model连接检查:', {
        hasGetConnectedNode: !!this.context.getConnectedNode,
        chatModelNodeInfo: chatModelNodeInfo ? {
          hasNode: !!chatModelNodeInfo.node,
          hasResult: !!chatModelNodeInfo.result,
          nodeType: chatModelNodeInfo.node?.data?.type || chatModelNodeInfo.node?.type,
          nodeId: chatModelNodeInfo.node?.id,
        } : null,
      })
      
      if (!chatModelNodeInfo || !chatModelNodeInfo.node) {
        return {
          success: false,
          error: '未找到连接的Chat Model节点：请从AI Agent节点底部的Chat Model端口（🤖）连接ChatGPT、Gemini或DeepSeek节点，并确保连接已保存。',
        }
      }

      const chatModelNode = chatModelNodeInfo.node
      const chatModelNodeType = chatModelNode.data?.type || chatModelNode.type
      const chatModelNodeConfig = chatModelNode.data?.config || {}
      
      console.log('[AIAgentExecutor] Chat Model配置:', {
        nodeType: chatModelNodeType,
        hasApiKey: !!chatModelNodeConfig.api_key,
        hasApiUrl: !!chatModelNodeConfig.api_url,
        apiUrl: chatModelNodeConfig.api_url,
        configKeys: Object.keys(chatModelNodeConfig),
      })
      
      // 根据节点类型构建Chat Model配置
      let chatModelConfig: any = {}
      if (chatModelNodeType === 'chatgpt') {
        chatModelConfig = {
          model_type: 'chatgpt',
          api_key: chatModelNodeConfig.api_key || '',
          api_url: chatModelNodeConfig.api_url || '',
          request_headers: chatModelNodeConfig.request_headers || '',
          request_body: chatModelNodeConfig.request_body || '{}',
        }
      } else if (chatModelNodeType === 'gemini') {
        chatModelConfig = {
          model_type: 'gemini',
          api_key: chatModelNodeConfig.api_key || '',
          api_url: chatModelNodeConfig.api_url || '',
          request_headers: chatModelNodeConfig.request_headers || '',
          request_body: chatModelNodeConfig.request_body || '{}',
        }
      } else if (chatModelNodeType === 'deepseek') {
        chatModelConfig = {
          model_type: 'deepseek',
          api_key: chatModelNodeConfig.api_key || '',
          api_url: chatModelNodeConfig.api_url || '',
          request_headers: chatModelNodeConfig.request_headers || '',
          request_body: chatModelNodeConfig.request_body || '{}',
        }
      } else if (chatModelNodeType === 'chat_model') {
        chatModelConfig = {
          model_type: chatModelNodeConfig.model_type || 'chatgpt',
          api_key: chatModelNodeConfig.api_key || '',
          api_url: chatModelNodeConfig.api_url || '',
          request_headers: chatModelNodeConfig.request_headers || '',
          request_body: chatModelNodeConfig.request_body || '{}',
        }
      } else {
        return {
          success: false,
          error: `不支持的Chat Model节点类型: ${chatModelNodeType}。请连接ChatGPT、Gemini或DeepSeek节点。`,
        }
      }

      // 验证必需的配置
      if (!chatModelConfig.api_url) {
        return {
          success: false,
          error: '连接的Chat Model节点缺少API URL配置：请在连接的Chat Model节点中配置API URL',
        }
      }

      // ========== 前端职责：调用后端API ==========
      
      message.loading({ content: 'AI Agent 正在处理...', key: 'ai_agent_execute' })

      // 准备请求数据（所有计算逻辑都在后端完成）
      const requestData = {
        input_data: inputData,  // 上游节点的输出数据
        system_prompt: systemPrompt,
        goal: goal,
        temperature: temperature,
        max_tokens: maxTokens,
        output_format: outputFormat,
        data_processing_mode: dataProcessingMode,
        data_limit_count: dataLimitCount,
        max_data_tokens: maxDataTokens,
        sample_strategy: sampleStrategy,
        chat_model_config: chatModelConfig,  // Chat Model配置
        use_memory: useMemory,
        memory_config: memoryConfig,
      }

      console.log('[AIAgentExecutor] 调用后端API:', {
        hasInputData: !!requestData.input_data,
        hasSystemPrompt: !!requestData.system_prompt,
        hasGoal: !!requestData.goal,
        chatModelType: requestData.chat_model_config.model_type,
        outputFormat: requestData.output_format,
      })

      // 调用后端API（所有计算逻辑都在后端完成）
      const response = await aiWorkflowApi.executeAIAgent(requestData)

      console.log('[AIAgentExecutor] 后端API响应:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasChatModelResponse: !!response.data?.chat_model_response,
        hasAiAgentOutput: !!response.data?.ai_agent_output,
        chatModelContent: response.data?.chat_model_response?.content?.substring(0, 100),
      })

      if (!response.success || !response.data) {
        const errorMessage = response.message || response.error || 'AI Agent执行失败'
        message.error({ content: errorMessage, key: 'ai_agent_execute' })
        return {
          success: false,
          error: errorMessage,
        }
      }

      // ========== 前端职责：更新UI状态 ==========
      
      // 后端返回的结果已经包含所有处理后的数据
      const result: ParsedFile = response.data

      // 设置执行结果
      this.context.setExecutionResult(result)

      message.success({ 
        content: 'AI Agent 执行成功', 
        key: 'ai_agent_execute',
        duration: 3
      })

      return {
        success: true,
        message: 'AI Agent 执行成功',
        result,
      }
    } catch (error: any) {
      console.error('[AIAgentExecutor] 执行失败:', error)
      return {
        success: false,
        error: `AI Agent 执行失败: ${error.message || String(error)}`,
      }
    }
  }
}
