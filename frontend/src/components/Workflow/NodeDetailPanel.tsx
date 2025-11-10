import { useState, useEffect } from 'react'
import { Drawer, Form, Input, Switch, Select, Tabs, Table, Button, Space, Typography, Divider, message, Spin, Descriptions, Tag } from 'antd'
import { 
  CloseOutlined, 
  SaveOutlined, 
  PlayCircleOutlined,
  FileTextOutlined,
  TableOutlined,
  CodeOutlined,
  FolderOpenOutlined,
  FileSyncOutlined,
  CheckCircleOutlined,
  FileOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { NodeType } from './WorkflowNode'
import { fileApi } from '@/services/api'
import type { ParsedFile } from '@/types'
import { getNodeExecutor } from './NodeExecutors'
import { getNodeConfigComponent } from './NodeConfigs'
import { NodeValidationView } from './NodeValidationViews'
import './NodeDetailPanel.css'

const { Text, Title } = Typography

// 文件内容预览组件
const FileContentPreview = ({ filePath }: { filePath: string }) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) return
    
    const loadFileContent = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('开始加载文件内容，文件路径:', filePath)
        // 使用统一的 API 客户端读取文件内容
        const data = await fileApi.getContent(filePath)
        console.log('文件内容加载成功，长度:', data.content?.length || 0)
        setContent(data.content || '')
      } catch (err: any) {
        // 提取详细的错误信息
        let errorMsg = '无法读取文件内容'
        if (err.message) {
          errorMsg = err.message
        } else if (err.response?.data?.detail) {
          errorMsg = err.response.data.detail
        } else if (typeof err === 'string') {
          errorMsg = err
        }
        setError(errorMsg)
        console.error('读取文件内容失败:', {
          error: err,
          filePath: filePath,
          response: err.response,
          message: err.message
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadFileContent()
  }, [filePath])

  if (loading) {
    return <Spin size="small" tip="加载中..." />
  }

  if (error) {
    return <Text type="danger" style={{ fontSize: '12px' }}>{error}</Text>
  }

  if (!content) {
    return <Text type="secondary" style={{ fontSize: '12px' }}>暂无内容</Text>
  }

  // 限制显示内容长度（增加到20000字符，适应更宽的界面）
  const displayContent = content.length > 20000 ? content.substring(0, 20000) + '...' : content

  return (
    <pre style={{
      background: '#f5f5f5',
      padding: '12px',
      borderRadius: '4px',
      overflow: 'auto',
      maxHeight: '600px',
      fontSize: '12px',
      fontFamily: 'monospace',
      lineHeight: '1.5',
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      width: '100%'
    }}>
      {displayContent}
      {content.length > 20000 && (
        <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '11px', padding: '8px', background: '#fff', borderRadius: '4px' }}>
          文件过长，仅显示前 20,000 字符（共 {content.length.toLocaleString()} 字符）
        </div>
      )}
    </pre>
  )
}

interface NodeData {
  label: string
  type: NodeType
  description?: string
  config?: Record<string, any>
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

interface NodeDetailPanelProps {
  open: boolean
  nodeId: string | null
  nodeData: NodeData | null
  onClose: () => void
  onSave: (values: { label: string; description: string; config: Record<string, any> }) => void
  onExecute?: () => void
  upstreamResult?: ParsedFile | null  // 上游节点的执行结果
  onExecutionResult?: (result: ParsedFile) => void  // 执行结果回调
  nodes?: any[]  // 工作流节点列表（用于查找连接的节点）
  edges?: any[]  // 工作流边列表（用于查找连接的节点）
  nodeExecutionResults?: Map<string, any>  // 节点执行结果映射（用于获取连接节点的执行结果）
}

// 获取输入数据（根据节点类型和配置）
const getInputData = (nodeType: NodeType, config?: Record<string, any>, upstreamResult?: ParsedFile | null) => {
  // 根据节点类型返回不同的输入数据
  switch (nodeType) {
    case 'parse_file':
      // 触发节点，显示节点配置信息作为输入
      if (!config) return null
      return {
        config: {
          file_path: config.file_path || '未设置',
          auto_detect: config.auto_detect !== undefined ? config.auto_detect : true,
          encoding: config.encoding || 'utf-8'
        }
      }
    case 'analyze_schema':
      return {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            items: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        data: {
          name: '示例数据',
          age: 25,
          items: ['item1', 'item2']
        }
      }
    case 'process_natural_language':
      return {
        schema: {
          type: 'object',
          properties: {
            parsed_data: { type: 'object' }
          }
        },
        data: {
          parsed_data: {
            name: '示例名称',
            value: 100
          }
        }
      }
    case 'ai_agent':
      // AI Agent 节点：显示上游节点的输出数据
      if (upstreamResult) {
        return {
          data: upstreamResult.data,
          schema: upstreamResult.schema,
          file_path: upstreamResult.file_path,
          original_format: upstreamResult.original_format,
          output_format: upstreamResult.output_format,
          analysis: upstreamResult.analysis,
          editor_config: upstreamResult.editor_config,
        }
      }
      // 如果没有上游数据，返回提示信息
      return {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'any' }
          }
        },
        data: {
          data: '来自上游节点的数据'
        }
      }
    default:
      // 对于非触发节点，如果有上游数据，返回上游数据
      if (upstreamResult) {
        return {
          data: upstreamResult.data,
          schema: upstreamResult.schema,
          file_path: upstreamResult.file_path,
          original_format: upstreamResult.original_format,
          output_format: upstreamResult.output_format,
          analysis: upstreamResult.analysis,
          editor_config: upstreamResult.editor_config,
        }
      }
      return {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'any' }
          }
        },
        data: {
          data: '来自上游节点的数据'
        }
      }
  }
}

const NodeDetailPanel = ({
  open,
  nodeId: _nodeId,
  nodeData,
  onClose,
  onSave,
  onExecute,
  upstreamResult,
  onExecutionResult,
  nodes = [],
  edges = [],
  nodeExecutionResults = new Map(),
}: NodeDetailPanelProps) => {
  const [form] = Form.useForm()
  const [activeInputTab, setActiveInputTab] = useState<'schema' | 'table' | 'json' | 'xml'>('schema')
  const [activeOutputTab, setActiveOutputTab] = useState<'schema' | 'table' | 'json' | 'xml' | 'workflow' | 'validation'>('validation')
  const [activeConfigTab, setActiveConfigTab] = useState<'parameters' | 'settings'>('parameters')
  // 用于跟踪文件路径，确保显示
  const [filePathValue, setFilePathValue] = useState<string>('')
  // 节点执行相关状态
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ParsedFile | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  // 当前配置值（从表单获取，用于实时更新INPUT显示）
  const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({})
  
  // 从全局执行结果中恢复当前节点的执行结果（如果存在）
  useEffect(() => {
    if (open && _nodeId && nodeExecutionResults.has(_nodeId)) {
      const savedResult = nodeExecutionResults.get(_nodeId)
      if (savedResult) {
        console.log(`[NodeDetailPanel] 从全局执行结果恢复，节点ID: ${_nodeId}`, savedResult ? '有数据' : '无数据')
        setExecutionResult(savedResult)
      }
    }
  }, [open, _nodeId, nodeExecutionResults])

  // INPUT 数据：只显示输入（来自上游节点）
  // 对于触发节点，显示配置；对于非触发节点，显示上游节点的输出
  const inputData = nodeData ? getInputData(nodeData.type, currentConfig, upstreamResult) : null
  
  // OUTPUT 数据：只显示当前节点的执行结果（不包含上游数据）
  // 执行后，显示当前节点新增的数据（如 analysis, editor_config 等）
  const outputData = executionResult ? (() => {
    // 根据节点类型显示不同的输出
    if (nodeData?.type === 'parse_file') {
      return {
        data: executionResult.data,
        schema: executionResult.schema,
        file_path: executionResult.file_path,
        original_format: executionResult.original_format,
        output_format: executionResult.output_format,
      }
    }
    if (nodeData?.type === 'analyze_xml_structure') {
      return {
        analysis: executionResult.analysis,
      }
    }
    if (nodeData?.type === 'generate_editor_config') {
      return {
        editor_config: executionResult.editor_config,
      }
    }
    if (nodeData?.type === 'smart_edit') {
      return {
        smart_edit_result: executionResult.smart_edit_result,
      }
    }
    if (nodeData?.type === 'generate_workflow') {
      return {
        generated_workflow: executionResult.generated_workflow,
      }
    }
    // AI Agent 节点：显示 Chat Model 的回答和处理后的数据
    if (nodeData?.type === 'ai_agent') {
      const result: any = {}
      
      // Chat Model 的原始回答（优先显示，这是AI Agent的主要输出）
      if (executionResult.ai_agent_output) {
        result.ai_agent_output = executionResult.ai_agent_output
      } else if (executionResult.chat_model_response?.content) {
        result.ai_agent_output = executionResult.chat_model_response.content
      }
      
      // 完整的 Chat Model 响应信息（必需，用于显示模型信息）
      if (executionResult.chat_model_response) {
        result.chat_model_response = executionResult.chat_model_response
      }
      
      // 处理后的数据（如果有）
      if (executionResult.data !== undefined && executionResult.data !== null) {
        result.data = executionResult.data
      }
      
      // 输出格式
      if (executionResult.output_format) {
        result.output_format = executionResult.output_format
      }
      
      // 保留上游数据（用于上下文）
      if (executionResult.file_path) {
        result.file_path = executionResult.file_path
      }
      if (executionResult.schema) {
        result.schema = executionResult.schema
      }
      if (executionResult.analysis) {
        result.analysis = executionResult.analysis
      }
      
      // 确保至少有一些内容可以显示（即使只有chat_model_response）
      // 如果没有ai_agent_output但有chat_model_response，至少返回chat_model_response
      if (Object.keys(result).length === 0 && executionResult.chat_model_response) {
        result.chat_model_response = executionResult.chat_model_response
        if (executionResult.ai_agent_output) {
          result.ai_agent_output = executionResult.ai_agent_output
        } else if (executionResult.chat_model_response.content) {
          result.ai_agent_output = executionResult.chat_model_response.content
        }
      }
      
      return result
    }
    // 通用输出
    return {
      data: executionResult.data,
      schema: executionResult.schema,
      output_format: executionResult.output_format,
    }
  })() : null
  
  // 根据输出格式自动选择OUTPUT标签页
  useEffect(() => {
    if (executionResult?.output_format) {
      const format = executionResult.output_format
      if (format === 'table') {
        setActiveOutputTab('table')
      } else if (format === 'schema') {
        setActiveOutputTab('schema')
      } else if (format === 'xml') {
        setActiveOutputTab('xml')
      } else if (format === 'json' || !format) {
        setActiveOutputTab('json')
      }
    }
  }, [executionResult?.output_format])

  // 根据上游节点的输出格式自动选择INPUT标签页
  useEffect(() => {
    if (upstreamResult?.output_format) {
      const format = upstreamResult.output_format
      if (format === 'table') {
        setActiveInputTab('table')
      } else if (format === 'schema') {
        setActiveInputTab('schema')
      } else if (format === 'xml') {
        setActiveInputTab('xml')
      } else if (format === 'json' || !format) {
        setActiveInputTab('json')
      }
    } else if (upstreamResult?.original_format === 'xml' || upstreamResult?.file_path?.endsWith('.xml')) {
      // 如果上游是XML文件但没有指定output_format，也显示XML标签页
      setActiveInputTab('xml')
    }
  }, [upstreamResult?.output_format, upstreamResult?.original_format, upstreamResult?.file_path])
  
  // 调试日志
  useEffect(() => {
    if (open && nodeData) {
      console.log(`[NodeDetailPanel] 节点详情面板打开，节点类型: ${nodeData.type}, 节点ID: ${_nodeId}`)
      console.log(`[NodeDetailPanel] upstreamResult:`, upstreamResult ? '有数据' : '无数据')
      console.log(`[NodeDetailPanel] inputData:`, inputData ? '有数据' : '无数据')
      console.log(`[NodeDetailPanel] executionResult:`, executionResult ? '有数据' : '无数据')
      console.log(`[NodeDetailPanel] outputData:`, outputData ? '有数据' : '无数据')
      if (upstreamResult) {
        console.log(`[NodeDetailPanel] upstreamResult 详情:`, {
          hasData: !!upstreamResult.data,
          hasSchema: !!upstreamResult.schema,
          hasAnalysis: !!upstreamResult.analysis,
          filePath: upstreamResult.file_path,
        })
      }
      if (executionResult) {
        console.log(`[NodeDetailPanel] executionResult 详情:`, {
          hasData: !!executionResult.data,
          hasSchema: !!executionResult.schema,
          hasAnalysis: !!executionResult.analysis,
          hasEditorConfig: !!executionResult.editor_config,
          filePath: executionResult.file_path,
        })
      }
    }
  }, [open, nodeData, upstreamResult, inputData, executionResult, outputData, _nodeId])

  useEffect(() => {
    if (open && nodeData) {
      const config = nodeData.config || {}
      const initialFilePath = config.file_path || ''
      
      // 对于 AI Agent 和 GPT Agent 节点，自动检测连接的节点
      if ((nodeData.type === 'ai_agent' || nodeData.type === 'gpt_agent') && _nodeId) {
        // 检测 Chat Model 连接（仅 AI Agent 需要）
        let chatModelEdge: any = null
        let chatModelConnected = false
        let chatModelNode: any = null
        if (nodeData.type === 'ai_agent') {
          chatModelEdge = edges.find(
            (edge) => edge.target === _nodeId && edge.targetHandle === 'chat_model'
          )
          chatModelConnected = !!chatModelEdge
          chatModelNode = chatModelConnected 
            ? nodes.find((node) => node.id === chatModelEdge.source)
            : null
        }
        
        // 检测 Memory 连接
        const memoryEdge = edges.find(
          (edge) => edge.target === _nodeId && edge.targetHandle === 'memory'
        )
        const memoryConnected = !!memoryEdge
        
        // 检测 Tool 连接
        const toolEdge = edges.find(
          (edge) => edge.target === _nodeId && edge.targetHandle === 'tool'
        )
        const toolConnected = !!toolEdge
        
        // 获取连接的节点信息
        const chatModelNodeInfo = chatModelNode ? {
          id: chatModelNode.id,
          type: chatModelNode.data?.type || chatModelNode.type,
          label: chatModelNode.data?.label || chatModelNode.label || chatModelNode.id,
        } : null
        
        const memoryNode = memoryConnected 
          ? nodes.find((node) => node.id === memoryEdge.source)
          : null
        const memoryNodeInfo = memoryNode ? {
          id: memoryNode.id,
          type: memoryNode.data?.type || memoryNode.type,
          label: memoryNode.data?.label || memoryNode.label || memoryNode.id,
        } : null
        
        const toolNode = toolConnected 
          ? nodes.find((node) => node.id === toolEdge.source)
          : null
        const toolNodeInfo = toolNode ? {
          id: toolNode.id,
          type: toolNode.data?.type || toolNode.type,
          label: toolNode.data?.label || toolNode.label || toolNode.id,
        } : null
        
        // 更新配置，保留原有配置，但覆盖连接状态和节点信息
        const updatedConfig: any = {
          ...config,
          memory_connected: memoryConnected,
          memory_node: memoryNodeInfo,
          tool_connected: toolConnected,
          tool_node: toolNodeInfo,
        }
        
        // AI Agent 需要 Chat Model 连接
        if (nodeData.type === 'ai_agent') {
          updatedConfig.chat_model_connected = chatModelConnected
          updatedConfig.chat_model_node = chatModelNodeInfo
        }
        
        console.log(`[NodeDetailPanel] ${nodeData.type === 'ai_agent' ? 'AI Agent' : 'GPT Agent'} 连接检测:`, {
          nodeId: _nodeId,
          chatModelConnected: nodeData.type === 'ai_agent' ? chatModelConnected : 'N/A',
          chatModelNodeInfo: nodeData.type === 'ai_agent' ? chatModelNodeInfo : 'N/A',
          memoryConnected,
          memoryNodeInfo,
          toolConnected,
          toolNodeInfo,
        })
        
        // 确保 config 字段正确设置（将配置放在 config 对象中）
        form.setFieldsValue({
          label: nodeData.label || nodeData.type || 'GPT Agent',
          description: nodeData.description || '',
          config: updatedConfig,  // 将配置放在 config 字段中
        })
        setCurrentConfig(updatedConfig)
      } else {
        // 其他节点类型，正常处理
        // 对于使用配置组件的节点（如 gpt_agent），需要将配置放在 config 字段中
        const isConfigComponentNode = ['gpt_agent', 'ai_agent', 'chatgpt', 'gemini', 'deepseek'].includes(nodeData.type)
        
        form.setFieldsValue({
          label: nodeData.label || nodeData.type || '节点',
          description: nodeData.description || '',
          ...(isConfigComponentNode ? { config } : config),  // 配置组件节点需要嵌套在 config 中
        })
        setCurrentConfig(config)
      }
      
      // 同步文件路径状态
      setFilePathValue(initialFilePath)
      
      // 优先使用已保存的执行结果，如果没有则使用上游结果
      if (_nodeId && nodeExecutionResults.has(_nodeId)) {
        const savedResult = nodeExecutionResults.get(_nodeId)
        if (savedResult) {
          console.log(`[NodeDetailPanel useEffect] 使用已保存的执行结果，节点ID: ${_nodeId}`)
          console.log(`[NodeDetailPanel useEffect] 已保存结果详情:`, {
            hasData: !!savedResult.data,
            hasSchema: !!savedResult.schema,
            hasAnalysis: !!savedResult.analysis,
            hasEditorConfig: !!savedResult.editor_config,
            hasChatModelResponse: !!savedResult.chat_model_response,
            hasAiAgentOutput: !!savedResult.ai_agent_output,
            filePath: savedResult.file_path,
            keys: Object.keys(savedResult),
          })
          setExecutionResult(savedResult)
        }
      } else if (upstreamResult) {
        console.log(`[NodeDetailPanel useEffect] 使用上游结果，节点ID: ${_nodeId}`)
        console.log(`[NodeDetailPanel useEffect] 上游结果详情:`, {
          hasData: !!upstreamResult.data,
          hasSchema: !!upstreamResult.schema,
          hasAnalysis: !!upstreamResult.analysis,
          hasEditorConfig: !!upstreamResult.editor_config,
          filePath: upstreamResult.file_path,
          keys: Object.keys(upstreamResult),
        })
        setExecutionResult(upstreamResult)
      } else {
        // 如果是 parse_file 节点，尝试从后端获取缓存结果
        if (nodeData.type === 'parse_file' && initialFilePath) {
          console.log(`[NodeDetailPanel useEffect] parse_file 节点，尝试从后端获取缓存，节点ID: ${_nodeId}, 文件路径: ${initialFilePath}`)
          // 异步获取缓存，不阻塞UI
          const loadCache = async () => {
            try {
              const { fileApi } = await import('@/services/api')
              const cacheResult = await fileApi.getParseCache(initialFilePath, {
                convert_format: config.convert_format || false,
                output_format: config.output_format,
                skip_schema: config.skip_schema || false,
              })
              
              if (cacheResult.cached && cacheResult.result) {
                console.log(`[NodeDetailPanel useEffect] 从后端获取到缓存结果，节点ID: ${_nodeId}`)
                setExecutionResult(cacheResult.result)
                // 同时更新全局执行结果，以便其他节点可以使用
                if (onExecutionResult && _nodeId) {
                  onExecutionResult(cacheResult.result)
                }
              } else {
                console.log(`[NodeDetailPanel useEffect] 后端没有缓存，节点ID: ${_nodeId}`)
                setExecutionResult(null)
              }
            } catch (error) {
              console.warn(`[NodeDetailPanel useEffect] 获取缓存失败: ${error}`)
              setExecutionResult(null)
            }
          }
          loadCache()
        } else {
          console.log(`[NodeDetailPanel useEffect] 没有已保存结果和上游结果，重置 executionResult，节点ID: ${_nodeId}`)
          setExecutionResult(null)
        }
      }
      setExecutionError(null)
    }
  }, [open, nodeData, form, upstreamResult, _nodeId, nodeExecutionResults, nodes, edges])

  // 当 edges 变化时，对于 AI Agent 和 GPT Agent 节点，自动更新连接状态
  useEffect(() => {
    if (open && (nodeData?.type === 'ai_agent' || nodeData?.type === 'gpt_agent') && _nodeId) {
      // 检测 Chat Model 连接（仅 AI Agent 需要）
      let chatModelEdge: any = null
      let chatModelConnected = false
      if (nodeData.type === 'ai_agent') {
        chatModelEdge = edges.find(
          (edge) => edge.target === _nodeId && edge.targetHandle === 'chat_model'
        )
        chatModelConnected = !!chatModelEdge
      }
      
      // 检测 Memory 连接
      const memoryEdge = edges.find(
        (edge) => edge.target === _nodeId && edge.targetHandle === 'memory'
      )
      const memoryConnected = !!memoryEdge
      
      // 检测 Tool 连接
      const toolEdge = edges.find(
        (edge) => edge.target === _nodeId && edge.targetHandle === 'tool'
      )
      const toolConnected = !!toolEdge
      
      // 获取连接的节点信息
      const chatModelNode = chatModelConnected && chatModelEdge
        ? nodes.find((node) => node.id === chatModelEdge.source)
        : null
      const chatModelNodeInfo = chatModelNode ? {
        id: chatModelNode.id,
        type: chatModelNode.data?.type || chatModelNode.type,
        label: chatModelNode.data?.label || chatModelNode.label || chatModelNode.id,
      } : null
      
      const memoryNode = memoryConnected 
        ? nodes.find((node) => node.id === memoryEdge.source)
        : null
      const memoryNodeInfo = memoryNode ? {
        id: memoryNode.id,
        type: memoryNode.data?.type || memoryNode.type,
        label: memoryNode.data?.label || memoryNode.label || memoryNode.id,
      } : null
      
      const toolNode = toolConnected 
        ? nodes.find((node) => node.id === toolEdge.source)
        : null
      const toolNodeInfo = toolNode ? {
        id: toolNode.id,
        type: toolNode.data?.type || toolNode.type,
        label: toolNode.data?.label || toolNode.label || toolNode.id,
      } : null
      
      // 更新表单字段
      const configUpdate: any = {
        ...form.getFieldValue('config'),
        memory_connected: memoryConnected,
        memory_node: memoryNodeInfo,
        tool_connected: toolConnected,
        tool_node: toolNodeInfo,
      }
      
      // AI Agent 需要 Chat Model 连接
      if (nodeData.type === 'ai_agent') {
        configUpdate.chat_model_connected = chatModelConnected
        configUpdate.chat_model_node = chatModelNodeInfo
      }
      
      form.setFieldsValue({
        config: configUpdate,
      })
      
      // 更新当前配置状态
      const currentConfig = form.getFieldValue('config') || {}
      const stateUpdate: any = {
        ...currentConfig,
        memory_connected: memoryConnected,
        memory_node: memoryNodeInfo,
        tool_connected: toolConnected,
        tool_node: toolNodeInfo,
      }
      
      // AI Agent 需要 Chat Model 连接
      if (nodeData.type === 'ai_agent') {
        stateUpdate.chat_model_connected = chatModelConnected
        stateUpdate.chat_model_node = chatModelNodeInfo
      }
      
      setCurrentConfig(stateUpdate)
      
      console.log(`[NodeDetailPanel] ${nodeData.type === 'ai_agent' ? 'AI Agent' : 'GPT Agent'} 连接状态已更新:`, {
        nodeId: _nodeId,
        chatModelConnected: nodeData.type === 'ai_agent' ? chatModelConnected : 'N/A',
        memoryConnected,
        toolConnected,
      })
    }
  }, [open, nodeData, _nodeId, edges, form])

  // 更新当前配置的函数
  const updateCurrentConfig = () => {
    const values = form.getFieldsValue()
    const config: Record<string, any> = {
      file_path: values.file_path || '',
      auto_detect: values.auto_detect !== undefined ? values.auto_detect : true,
      encoding: values.encoding || 'utf-8'
    }
    setCurrentConfig(config)
  }

  // 初始化时更新配置
  useEffect(() => {
    if (open) {
      updateCurrentConfig()
    }
  }, [open, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const { label, description, config, ...restConfig } = values
      
      // 确保 label 有值，如果没有则使用节点类型作为默认值
      const finalLabel = label || nodeData?.type || '节点'
      
      // 对于使用配置组件的节点（如 gpt_agent），config 字段已经嵌套在 values.config 中
      // 对于其他节点，配置字段直接展开在 restConfig 中
      const isConfigComponentNode = nodeData && ['gpt_agent', 'ai_agent', 'chatgpt', 'gemini', 'deepseek'].includes(nodeData.type)
      const finalConfig = isConfigComponentNode ? (config || {}) : restConfig
      
      onSave({
        label: finalLabel,
        description: description || '',
        config: finalConfig,
      })
      onClose()
    } catch (error: any) {
      console.error('表单验证失败:', error)
      // 显示验证错误信息
      if (error.errorFields && error.errorFields.length > 0) {
        const firstError = error.errorFields[0]
        const fieldName = Array.isArray(firstError.name) 
          ? firstError.name.join('.') 
          : firstError.name || '字段'
        const errorMessage = firstError.errors?.[0] || '验证失败'
        
        // 将字段路径转换为友好的中文名称
        let friendlyName = fieldName
        if (fieldName.includes('api_key')) {
          friendlyName = 'API Key'
        } else if (fieldName.includes('api_url')) {
          friendlyName = 'API 地址'
        } else if (fieldName.includes('label')) {
          friendlyName = '节点名称'
        } else if (fieldName.includes('config')) {
          // 提取配置字段名
          const configField = fieldName.replace('config.', '')
          friendlyName = configField
        }
        
        message.error({
          content: `${friendlyName}: ${errorMessage}`,
          duration: 5,
        })
      } else {
        message.error({
          content: '表单验证失败，请检查必填字段',
          duration: 3,
        })
      }
    }
  }

  // 处理节点执行 - 使用执行器模式
  const handleNodeExecute = async () => {
    if (!nodeData) return
    
    console.log(`[handleNodeExecute] 开始执行节点: ${nodeData.type}, 节点ID: ${_nodeId}`)
    console.log(`[handleNodeExecute] 当前 executionResult:`, executionResult ? '有数据' : '无数据')
    console.log(`[handleNodeExecute] 上游 upstreamResult:`, upstreamResult ? '有数据' : '无数据')
    
    // 优先使用上游节点的数据作为初始执行结果
    // 如果当前节点已经执行过，使用当前结果；否则使用上游结果
    const initialResult = executionResult || upstreamResult || null
    
    // 获取连接的节点信息（用于AI Agent等节点）
    const getConnectedNode = (nodeId: string, targetHandle: string) => {
      // 查找连接到指定端口的边
      const connectedEdge = edges.find(
        (edge) => edge.target === nodeId && edge.targetHandle === targetHandle
      )
      if (!connectedEdge) return null

      // 查找源节点
      const sourceNode = nodes.find((node) => node.id === connectedEdge.source)
      if (!sourceNode) return null

      // 获取源节点的执行结果
      const sourceResult = nodeExecutionResults.get(connectedEdge.source) || null

      return { node: sourceNode, result: sourceResult }
    }

    // 获取节点执行器
    const executor = getNodeExecutor(nodeData.type, {
      form,
      executionResult: initialResult,  // 使用上游或当前结果（确保不是undefined）
      upstreamResult: upstreamResult || null,  // 也传递上游结果，让执行器自己决定（确保不是undefined）
      setExecutionResult: (result) => {
        console.log(`[handleNodeExecute] setExecutionResult 回调被调用，节点ID: ${_nodeId}`)
        setExecutionResult(result)
        // 通知父组件更新全局执行结果（立即通知，不等待执行完成）
        if (onExecutionResult) {
          console.log(`[handleNodeExecute] 调用 onExecutionResult 回调，节点ID: ${_nodeId}`)
          onExecutionResult(result)
        } else {
          console.warn(`[handleNodeExecute] onExecutionResult 回调未定义，节点ID: ${_nodeId}`)
        }
      },
      setExecuting,
      setExecutionError,
      getConnectedNode: _nodeId ? (nodeId: string, targetHandle: string) => {
        // 如果传入的nodeId为空，使用当前节点ID
        const actualNodeId = nodeId || _nodeId
        return getConnectedNode(actualNodeId, targetHandle)
      } : undefined,
    })
    
    if (!executor) {
      message.info('该节点类型的执行功能开发中')
      return
    }
    
    try {
      setExecuting(true)
      setExecutionError(null)
      
      // 执行节点逻辑
      const result = await executor.execute()
      console.log(`[handleNodeExecute] 执行器返回结果:`, result.success ? '成功' : '失败', result.error || '')
      
      if (result.success && result.result) {
        setExecutionResult(result.result)
        // 通知父组件更新全局执行结果（双重保险，确保结果被存储）
        if (onExecutionResult) {
          console.log(`[handleNodeExecute] 执行成功，调用 onExecutionResult 回调，节点ID: ${_nodeId}`)
          onExecutionResult(result.result)
        } else {
          console.warn(`[handleNodeExecute] 执行成功但 onExecutionResult 回调未定义，节点ID: ${_nodeId}`)
        }
      } else if (!result.success) {
        const errorMessage = result.error || '执行失败'
        setExecutionError(errorMessage)
        
        // 即使执行失败，也存储错误信息到执行结果中，以便下游节点能够识别上游节点失败
        const errorResult: ParsedFile = {
          hasData: false,
          error: errorMessage,
          executionError: errorMessage,
        } as any
        
        setExecutionResult(errorResult)
        if (onExecutionResult) {
          console.log(`[handleNodeExecute] 执行失败，存储错误信息到执行结果，节点ID: ${_nodeId}`)
          onExecutionResult(errorResult)
        }
      }
    } catch (error: any) {
      console.error('[handleNodeExecute] 节点执行错误:', error)
      setExecutionError(error?.message || '操作失败')
      message.error({ content: error?.message || '操作失败', key: 'execute' })
    } finally {
      setExecuting(false)
    }
  }

  // 处理文件选择
  const handleFileSelect = async (fieldName: 'file_path' | 'output_path') => {
    // 创建临时的文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.style.display = 'none'
    
    // 根据字段类型设置接受的文件类型
    if (fieldName === 'file_path') {
      input.accept = '.xml,.json,.yaml,.yml,.csv,.tsv,.xlsx,.xls'
    } else {
      // 对于输出路径，如果是文件夹选择，可能需要特殊处理
      // 但浏览器限制，只能选择文件，所以这里也使用文件选择
      input.webkitdirectory = false // 暂时不支持文件夹选择
    }
    
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        const file = target.files[0]
        
        try {
          // 如果是输入文件路径，需要上传文件到服务器
          if (fieldName === 'file_path') {
            message.loading({ content: '正在上传文件...', key: 'upload' })
            const result = await fileApi.upload(file)
            // 使用服务器返回的文件路径
            const filePath = result.path
            // 同时更新表单值和状态
            form.setFieldsValue({ [fieldName]: filePath })
            setFilePathValue(filePath)
            // 立即更新当前配置以刷新INPUT显示
            updateCurrentConfig()
            message.success({ content: `文件上传成功: ${result.filename}`, key: 'upload' })
          } else {
            // 对于输出路径，浏览器无法获取完整路径，只能使用文件名
            // 用户可以手动编辑完整路径
            const fileName = file.name
            form.setFieldsValue({ [fieldName]: fileName })
          }
        } catch (error: any) {
          message.error({ content: `文件处理失败: ${error.message}`, key: 'upload' })
        }
      }
      // 清理临时元素
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input)
        }
      }, 100)
    }
    
    // 添加取消事件处理，避免用户取消选择时出错
    input.oncancel = () => {
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input)
        }
      }, 100)
    }
    
    document.body.appendChild(input)
    input.click()
  }

  const renderNodeSpecificConfig = () => {
    if (!nodeData?.type) return null

    switch (nodeData.type) {
      case 'parse_file':
        return (
          <>
            <Form.Item
              name="file_path"
              label="文件路径"
              rules={[{ required: true, message: '请选择或输入文件路径' }]}
            >
              <Input.Group compact>
                <Input
                  style={{ width: 'calc(100% - 40px)' }}
                  placeholder="例如: data/uploads/file.xml"
                  value={filePathValue || form.getFieldValue('file_path') || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFilePathValue(value)
                    form.setFieldValue('file_path', value)
                    // 立即更新当前配置以刷新INPUT显示
                    updateCurrentConfig()
                  }}
                />
                <Button
                  type="default"
                  icon={<FolderOpenOutlined />}
                  onClick={() => handleFileSelect('file_path')}
                  style={{ width: '40px' }}
                />
              </Input.Group>
            </Form.Item>
            <Form.Item name="auto_detect" label="自动检测格式" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="encoding" label="文件编码">
              <Select defaultValue="utf-8">
                <Select.Option value="utf-8">UTF-8</Select.Option>
                <Select.Option value="gbk">GBK</Select.Option>
                <Select.Option value="gb2312">GB2312</Select.Option>
              </Select>
            </Form.Item>
          </>
        )
      case 'analyze_schema':
        return (
          <>
            <Form.Item name="use_ai" label="使用AI分析" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="depth" label="分析深度">
              <Select defaultValue="deep">
                <Select.Option value="shallow">浅层</Select.Option>
                <Select.Option value="deep">深层</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="include_examples" label="包含示例数据" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        )
      case 'process_natural_language':
        return (
          <>
            <Form.Item name="use_ai" label="使用AI" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item 
              name="instruction" 
              label="指令"
              rules={[{ required: true, message: '请输入指令' }]}
            >
              <Input.TextArea rows={4} placeholder="例如: 将所有的剑的重量减少10%" />
            </Form.Item>
            <Form.Item name="model" label="AI模型">
              <Select defaultValue="qwen2.5-7b">
                <Select.Option value="qwen2.5-7b">Qwen2.5-7B</Select.Option>
                <Select.Option value="gpt-4">GPT-4</Select.Option>
              </Select>
            </Form.Item>
          </>
        )
      case 'apply_operations':
        return (
          <>
            <Form.Item name="validate_before_apply" label="应用前验证" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="rollback_on_error" label="错误时回滚" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="batch_size" label="批处理大小">
              <Input type="number" defaultValue={100} />
            </Form.Item>
          </>
        )
      // 所有新节点类型使用配置组件
      case 'edit_data':
      case 'filter_data':
      case 'validate_data':
      case 'analyze_xml_structure':
      case 'generate_editor_config':
      case 'smart_edit':
      case 'generate_workflow':
      case 'chatgpt':
      case 'gemini':
      case 'deepseek':
      case 'memory':
      case 'ai_agent':
      case 'gpt_agent':
      case 'gemini_agent':
      case 'export_file': {
        const ConfigComponent = getNodeConfigComponent(nodeData.type)
        if (ConfigComponent) {
          return (
            <ConfigComponent
              form={form}
              filePathValue={filePathValue}
              setFilePathValue={setFilePathValue}
              onFileSelect={handleFileSelect}
              onConfigChange={updateCurrentConfig}
              nodes={nodes}
              edges={edges}
              nodeId={_nodeId || undefined}
            />
          )
        }
        // 如果配置组件不存在，返回null（不应该发生）
        console.warn(`节点类型 ${nodeData.type} 没有配置组件`)
        return null
      }
      default:
        return null
    }
  }

  // 增强的Schema视图，显示更详细的结构信息
  const renderSchemaView = (schema: any) => {
    if (!schema) return <Text type="secondary">暂无数据</Text>
    
    // 扁平化 Schema 结构，显示完整路径（更紧凑的格式）
    const flattenSchema = (obj: any, prefix = '', result: Array<{ path: string; type: string; info: string }> = []): Array<{ path: string; type: string; info: string }> => {
      if (!obj || typeof obj !== 'object') {
        return result
      }

      // 处理 properties
      if (obj.properties) {
        Object.entries(obj.properties).forEach(([key, value]: [string, any]) => {
          const fullPath = prefix ? `${prefix}.${key}` : key
          
          if (value.type === 'object' && value.properties) {
            // 嵌套对象，只显示路径和类型，不递归显示子字段
            result.push({ 
              path: fullPath, 
              type: 'object', 
              info: `${Object.keys(value.properties || {}).length} 个字段` 
            })
            // 递归处理子字段
            flattenSchema(value, fullPath, result)
          } else if (value.type === 'array') {
            // 数组类型
            let arrayInfo = 'array'
            if (value.items) {
              if (value.items.type === 'object' && value.items.properties) {
                arrayInfo = `array[object(${Object.keys(value.items.properties || {}).length} 个字段)]`
                // 递归处理数组元素的 schema
                flattenSchema(value.items, `${fullPath}[]`, result)
              } else {
                arrayInfo = `array[${value.items.type || 'unknown'}]`
              }
            }
            result.push({ path: fullPath, type: 'array', info: arrayInfo })
          } else {
            // 基本类型
            result.push({ 
              path: fullPath, 
              type: value.type || 'unknown', 
              info: value.description || '-' 
            })
          }
        })
      } else {
        // 直接处理对象
        Object.entries(obj).forEach(([key, value]: [string, any]) => {
          const fullPath = prefix ? `${prefix}.${key}` : key
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (value.type === 'object' && value.properties) {
              result.push({ 
                path: fullPath, 
                type: 'object', 
                info: `${Object.keys(value.properties || {}).length} 个字段` 
              })
              flattenSchema(value, fullPath, result)
            } else {
              result.push({ path: fullPath, type: 'object', info: '-' })
              flattenSchema(value, fullPath, result)
            }
          } else {
            result.push({ path: fullPath, type: typeof value, info: '-' })
          }
        })
      }
      
      return result
    }

    const flattened = flattenSchema(schema)
    
    if (flattened.length === 0) {
      return <Text type="secondary">暂无 Schema 数据</Text>
    }

    return (
      <div style={{ padding: '4px 0' }}>
        <Table
          dataSource={flattened}
          columns={[
            {
              title: '字段路径',
              dataIndex: 'path',
              key: 'path',
              width: '55%',
              ellipsis: true,
              render: (path: string) => (
                <Text 
                  code 
                  style={{ 
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace'
                  }}
                  title={path}
                >
                  {path}
                </Text>
              ),
            },
            {
              title: '类型',
              dataIndex: 'type',
              key: 'type',
              width: '15%',
              render: (type: string) => (
                <Tag color="blue" style={{ fontSize: '11px', margin: 0 }}>
                  {type}
                </Tag>
              ),
            },
            {
              title: '信息',
              dataIndex: 'info',
              key: 'info',
              width: '30%',
              ellipsis: true,
              render: (info: string) => (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {info}
                </Text>
              ),
            },
          ]}
          pagination={false}
          size="small"
          scroll={{ y: 400, x: 'max-content' }}
          style={{ fontSize: '12px' }}
        />
      </div>
    )
  }

  const renderTableView = (data: any) => {
    if (!data) return <Text type="secondary">暂无数据</Text>
    
    // 处理 table 格式的数据（数组）
    if (Array.isArray(data.data)) {
      // 如果是数组，直接作为表格数据源
      if (data.data.length === 0) {
        return <Text type="secondary">暂无数据</Text>
      }
      
      // 从第一条数据获取列定义
      const firstRow = data.data[0]
      const columns = Object.keys(firstRow).map(key => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (text: any) => {
          if (typeof text === 'object' && text !== null) {
            return JSON.stringify(text)
          }
          return String(text ?? '')
        },
      }))

      return (
        <Table
          dataSource={data.data}
          columns={columns}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ y: 400, x: 'max-content' }}
        />
      )
    }
    
    // 处理对象格式的数据（展平为表格）
    if (data.data && typeof data.data === 'object') {
      const flatData = flattenObject(data.data)
      const columns = Object.keys(flatData).map(key => ({
        title: key,
        dataIndex: key,
        key,
      }))

      return (
        <Table
          dataSource={[flatData]}
          columns={columns}
          pagination={false}
          size="small"
        />
      )
    }
    
    return <Text type="secondary">暂无数据</Text>
  }

  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const result: Record<string, any> = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(result, flattenObject(obj[key], newKey))
        } else {
          result[newKey] = Array.isArray(obj[key]) ? JSON.stringify(obj[key]) : obj[key]
        }
      }
    }
    return result
  }

  const renderJsonView = (data: any) => {
    if (!data) return <Text type="secondary">暂无数据</Text>
    
    return (
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '12px', 
        borderRadius: '4px', 
        overflow: 'auto',
        maxHeight: '600px',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        width: '100%'
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    )
  }

  // 将对象转换为XML格式字符串（简化版）
  const objectToXml = (obj: any, rootName: string = 'root', indent: string = ''): string => {
    if (obj === null || obj === undefined) {
      return ''
    }

    // 如果是字符串，直接返回
    if (typeof obj === 'string') {
      // 检查是否是XML字符串
      if (obj.trim().startsWith('<')) {
        return obj
      }
      // 转义XML特殊字符
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }

    // 如果是数字或布尔值
    if (typeof obj !== 'object') {
      return String(obj)
    }

    // 如果是数组
    if (Array.isArray(obj)) {
      return obj.map((item) => {
        const itemName = rootName.endsWith('s') ? rootName.slice(0, -1) : `${rootName}_item`
        return objectToXml(item, itemName, indent + '  ')
      }).join('\n')
    }

    // 如果是对象
    let xml = ''
    const keys = Object.keys(obj)
    
    // 获取当前对象的属性
    const attrs = obj['@attributes'] || {}
    const textContent = obj['#text']
    const attrStr = Object.keys(attrs).map(attr => `${attr}="${String(attrs[attr]).replace(/"/g, '&quot;')}"`).join(' ')
    const attrPrefix = attrStr ? ` ${attrStr}` : ''
    
    for (const key of keys) {
      const value = obj[key]
      
      // 跳过特殊键
      if (key === '@attributes' || key === '#text') {
        continue
      }

      if (value === null || value === undefined) {
        xml += `${indent}<${key}${attrPrefix} />\n`
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            // 为数组项获取属性
            const itemAttrs = item['@attributes'] || {}
            const itemAttrStr = Object.keys(itemAttrs).map(attr => `${attr}="${String(itemAttrs[attr]).replace(/"/g, '&quot;')}"`).join(' ')
            const itemAttrPrefix = itemAttrStr ? ` ${itemAttrStr}` : ''
            const itemText = item['#text'] || ''
            
            xml += `${indent}<${key}${itemAttrPrefix}>\n`
            const itemContent = objectToXml(item, key, indent + '  ')
            if (itemText && !itemContent.trim()) {
              xml += `${indent}  ${itemText}\n`
            } else {
              xml += itemContent
            }
            xml += `${indent}</${key}>\n`
          })
        } else {
          // 为子对象获取属性
          const childAttrs = value['@attributes'] || {}
          const childAttrStr = Object.keys(childAttrs).map(attr => `${attr}="${String(childAttrs[attr]).replace(/"/g, '&quot;')}"`).join(' ')
          const childAttrPrefix = childAttrStr ? ` ${childAttrStr}` : ''
          const childText = value['#text'] || ''
          
          xml += `${indent}<${key}${childAttrPrefix}>\n`
          const childContent = objectToXml(value, key, indent + '  ')
          if (childText && !childContent.trim()) {
            xml += `${indent}  ${childText}\n`
          } else {
            xml += childContent
          }
          xml += `${indent}</${key}>\n`
        }
      } else {
        xml += `${indent}<${key}${attrPrefix}>${String(value)}</${key}>\n`
      }
    }
    
    // 如果有文本内容但没有子元素，添加文本
    if (textContent && !xml.trim()) {
      xml = `${indent}${textContent}\n`
    }

    return xml
  }

  const renderXmlView = (data: any, isInput: boolean = false) => {
    if (!data) return <Text type="secondary">暂无数据</Text>
    
    // 确定使用的数据源：INPUT区域使用inputData/upstreamResult，OUTPUT区域使用executionResult
    const filePath = isInput ? (data.file_path || upstreamResult?.file_path) : executionResult?.file_path
    const originalFormat = isInput ? (data.original_format || upstreamResult?.original_format) : executionResult?.original_format
    const outputFormat = isInput ? (data.output_format || upstreamResult?.output_format) : executionResult?.output_format
    
    // 关键逻辑：如果input是XML，output也是XML，且没有开启转换，直接显示原始文件内容
    const isXMLInput = originalFormat === 'xml' || filePath?.endsWith('.xml')
    const isXMLOutput = outputFormat === 'xml'
    const shouldShowOriginal = isXMLInput && (isXMLOutput || !outputFormat)
    
    // 如果应该显示原始内容，直接读取文件
    if (shouldShowOriginal && filePath) {
      return (
        <div>
          <div style={{ marginBottom: '12px', padding: '8px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <InfoCircleOutlined /> XML格式：显示原始文件内容（未转换）
            </Text>
          </div>
          <FileContentPreview filePath={filePath} />
        </div>
      )
    }
    
    // 如果明确要求转换，或者不是XML输入，显示转换后的内容
    if (filePath && originalFormat === 'xml' && !shouldShowOriginal) {
      return (
        <div>
          <div style={{ marginBottom: '12px', padding: '8px', background: '#fff7e6', borderRadius: '4px', border: '1px solid #ffd591' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <InfoCircleOutlined /> 已转换为XML格式（从解析后的数据结构生成）
            </Text>
          </div>
          <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
            原始XML文件内容：
          </Text>
          <FileContentPreview filePath={filePath} />
          <Divider />
          <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
            转换后的XML内容：
          </Text>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px', 
            overflow: 'auto',
            maxHeight: '600px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%'
          }}>
            {data.data ? objectToXml(data.data, 'root') : '暂无数据'}
          </pre>
        </div>
      )
    }
    
    // 如果没有文件路径，直接转换数据为XML
    let xmlContent = ''
    if (data.data) {
      xmlContent = objectToXml(data.data, 'root')
    } else {
      xmlContent = objectToXml(data, 'root')
    }
    
    return (
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '12px', 
        borderRadius: '4px', 
        overflow: 'auto',
        maxHeight: '600px',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        width: '100%'
      }}>
        {xmlContent || '暂无数据'}
      </pre>
    )
  }

  if (!nodeData) return null

  const isTrigger = nodeData.type === 'parse_file'

  return (
    <Drawer
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
            <Title level={4} style={{ margin: 0 }}>
              {nodeData.label || nodeData.type}
            </Title>
          </Space>
          <Space>
            {onExecute && (
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={handleNodeExecute}
                loading={executing}
                disabled={executing}
              >
                执行节点
              </Button>
            )}
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存
            </Button>
          </Space>
        </Space>
      }
      open={open}
      onClose={onClose}
      width="95%"
      style={{ maxWidth: '1800px' }}
      placement="right"
      mask={false}
      className="node-detail-panel"
    >
      <div className="node-detail-content">
        {/* 左侧：INPUT */}
        <div className="node-detail-section node-detail-input">
          <div className="node-detail-section-header">
            <Title level={5}>INPUT</Title>
          </div>
          {isTrigger ? (
            <div style={{ padding: '24px' }}>
              {!executionResult && (
                <div style={{ marginBottom: '16px', textAlign: 'center', color: '#8c8c8c' }}>
                  <Text>触发节点没有输入数据</Text>
                </div>
              )}
              {inputData?.config && (
                <div>
                  <Title level={5} style={{ marginBottom: '12px' }}>节点配置</Title>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="文件路径">
                      <Text strong={!!inputData.config.file_path && inputData.config.file_path !== '未设置'}>
                        {inputData.config.file_path || '未设置'}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="自动检测格式">
                      {inputData.config.auto_detect ? '是' : '否'}
                    </Descriptions.Item>
                    <Descriptions.Item label="文件编码">
                      {inputData.config.encoding || 'utf-8'}
                    </Descriptions.Item>
                  </Descriptions>
                  {executionResult && (
                    <>
                      <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                        <Title level={5} style={{ marginBottom: '8px', fontSize: '14px' }}>已加载文件</Title>
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="文件路径">
                            <Text code>{executionResult.file_path}</Text>
                          </Descriptions.Item>
                                  <Descriptions.Item label="原始格式">
                            <Text>
                              {executionResult.original_format?.toUpperCase() || 
                               (executionResult.file_path ? executionResult.file_path.split('.').pop()?.toUpperCase() : '未知') || 
                               '未知'}
                            </Text>
                          </Descriptions.Item>
                          {executionResult.output_format && (
                            <Descriptions.Item label="输出格式">
                              <Text strong style={{ color: '#1890ff' }}>
                                {executionResult.output_format.toUpperCase()}
                              </Text>
                            </Descriptions.Item>
                          )}
                          <Descriptions.Item label="数据项数">
                            <Text>
                              {executionResult.data 
                                ? (Array.isArray(executionResult.data) 
                                    ? executionResult.data.length 
                                    : Object.keys(executionResult.data).length)
                                : 0}
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>
                      </div>
                      {executionResult.file_path && (
                        <div style={{ marginTop: '16px' }}>
                          <Title level={5} style={{ marginBottom: '8px', fontSize: '14px' }}>源文件内容</Title>
                          <FileContentPreview filePath={executionResult.file_path} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : inputData ? (
            <Tabs
              activeKey={activeInputTab}
              onChange={(key) => setActiveInputTab(key as 'schema' | 'table' | 'json' | 'xml')}
              items={[
                {
                  key: 'schema',
                  label: (
                    <Space>
                      <FileTextOutlined />
                      Schema
                    </Space>
                  ),
                  children: renderSchemaView(inputData.schema),
                },
                {
                  key: 'table',
                  label: (
                    <Space>
                      <TableOutlined />
                      Table
                    </Space>
                  ),
                  children: renderTableView(inputData),
                },
                {
                  key: 'json',
                  label: (
                    <Space>
                      <CodeOutlined />
                      JSON
                    </Space>
                  ),
                  children: renderJsonView(inputData),
                },
                {
                  key: 'xml',
                  label: (
                    <Space>
                      <FileOutlined />
                      XML
                    </Space>
                  ),
                  children: renderXmlView(inputData, true),
                },
              ]}
            />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8c8c8c' }}>
              <Text>暂无输入数据</Text>
            </div>
          )}
        </div>

        {/* 中间：节点配置 */}
        <div className="node-detail-section node-detail-config">
          <div className="node-detail-section-header">
            <Title level={5}>{nodeData.label || nodeData.type}</Title>
          </div>
          <Tabs
            activeKey={activeConfigTab}
            onChange={(key) => setActiveConfigTab(key as 'parameters' | 'settings')}
            items={[
              {
                key: 'parameters',
                label: 'Parameters',
                children: (
                  <Form 
                    form={form} 
                    layout="vertical" 
                    style={{ paddingTop: '16px' }}
                    onValuesChange={() => updateCurrentConfig()}
                  >
                    <Form.Item
                      name="label"
                      label="节点名称"
                      rules={[{ required: true, message: '请输入节点名称' }]}
                    >
                      <Input placeholder="例如: 解析文件" />
                    </Form.Item>
                    <Form.Item name="description" label="节点描述">
                      <Input.TextArea rows={2} placeholder="例如: 读取并解析配置文件" />
                    </Form.Item>
                    <Divider />
                    {renderNodeSpecificConfig()}
                  </Form>
                ),
              },
              {
                key: 'settings',
                label: 'Settings',
                children: (
                  <Form form={form} layout="vertical" style={{ paddingTop: '16px' }}>
                    <Form.Item name="continue_on_fail" label="失败时继续" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="retry_on_fail" label="失败时重试" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="retry_count" label="重试次数">
                      <Input type="number" defaultValue={3} min={0} max={10} />
                    </Form.Item>
                    <Form.Item name="timeout" label="超时时间（秒）">
                      <Input type="number" defaultValue={30} min={1} />
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </div>

        {/* 右侧：OUTPUT */}
        <div className="node-detail-section node-detail-output">
          <div className="node-detail-section-header">
            <Title level={5}>OUTPUT</Title>
          </div>
          {executing ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <Spin size="large" tip="正在执行节点..." />
            </div>
          ) : executionError ? (
            <div style={{ padding: '24px' }}>
              {(() => {
                // 尝试解析错误信息（可能是 JSON 格式）
                let errorInfo: any = null
                try {
                  errorInfo = JSON.parse(executionError)
                } catch {
                  // 如果不是 JSON，使用原始错误信息
                  errorInfo = { error_detail: executionError }
                }
                
                const errorType = errorInfo.error_type || 'UNKNOWN_ERROR'
                const errorMessage = errorInfo.error_message || '执行失败'
                const errorDetail = errorInfo.error_detail || executionError
                const statusCode = errorInfo.status_code
                
                // 根据错误类型显示不同的图标和颜色
                const getErrorIcon = () => {
                  switch (errorType) {
                    case 'TIMEOUT':
                      return '⏱️'
                    case 'TOKEN_LIMIT':
                      return '📊'
                    case 'RATE_LIMIT':
                      return '🚦'
                    case 'AUTH_ERROR':
                      return '🔐'
                    case 'QUOTA_EXCEEDED':
                      return '💰'
                    case 'NETWORK_ERROR':
                      return '🌐'
                    default:
                      return '❌'
                  }
                }
                
                const getErrorColor = () => {
                  switch (errorType) {
                    case 'TIMEOUT':
                      return '#faad14'
                    case 'TOKEN_LIMIT':
                      return '#ff4d4f'
                    case 'RATE_LIMIT':
                      return '#faad14'
                    case 'AUTH_ERROR':
                      return '#ff4d4f'
                    case 'QUOTA_EXCEEDED':
                      return '#ff4d4f'
                    case 'NETWORK_ERROR':
                      return '#faad14'
                    default:
                      return '#ff4d4f'
                  }
                }
                
                return (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        color: getErrorColor(), 
                        marginBottom: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>{getErrorIcon()}</span>
                        <span>{errorMessage}</span>
                        {statusCode && (
                          <span style={{ 
                            fontSize: '12px', 
                            fontWeight: 'normal',
                            color: '#8c8c8c',
                            marginLeft: '8px'
                          }}>
                            (HTTP {statusCode})
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        background: '#fff2e8',
                        padding: '12px',
                        borderRadius: '4px',
                        border: `1px solid ${getErrorColor()}`,
                        marginTop: '8px'
                      }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                          错误详情：
                        </Text>
                        <Text style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                          {errorDetail}
                        </Text>
                      </div>
                      {errorType === 'TOKEN_LIMIT' && (
                        <div style={{ 
                          marginTop: '12px',
                          padding: '12px',
                          background: '#f6ffed',
                          borderRadius: '4px',
                          border: '1px solid #b7eb8f'
                        }}>
                          <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                            💡 建议：减少输入内容长度，或使用更小的模型（如 gpt-5-nano）
                          </Text>
                        </div>
                      )}
                      {errorType === 'RATE_LIMIT' && (
                        <div style={{ 
                          marginTop: '12px',
                          padding: '12px',
                          background: '#fff7e6',
                          borderRadius: '4px',
                          border: '1px solid #ffd591'
                        }}>
                          <Text style={{ fontSize: '12px', color: '#fa8c16' }}>
                            💡 建议：请稍后重试，或减少并发请求数量
                          </Text>
                        </div>
                      )}
                      {errorType === 'TIMEOUT' && (
                        <div style={{ 
                          marginTop: '12px',
                          padding: '12px',
                          background: '#fff7e6',
                          borderRadius: '4px',
                          border: '1px solid #ffd591'
                        }}>
                          <Text style={{ fontSize: '12px', color: '#fa8c16' }}>
                            💡 建议：检查网络连接，或在配置中增加超时时间
                          </Text>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (outputData && Object.keys(outputData).length > 0) || (executionResult && (executionResult.chat_model_response || executionResult.ai_agent_output)) ? (
            <Tabs
              activeKey={activeOutputTab}
              onChange={(key) => setActiveOutputTab(key as 'schema' | 'table' | 'json' | 'xml' | 'workflow' | 'validation')}
              items={[
                // 验证视图（优先显示，针对特定节点类型）
                ...((nodeData?.type === 'parse_file' || 
                     nodeData?.type === 'analyze_xml_structure' || 
                     nodeData?.type === 'generate_editor_config') ? [{
                  key: 'validation',
                  label: (
                    <Space>
                      <CheckCircleOutlined />
                      验证
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: '16px' }}>
                      <NodeValidationView 
                        nodeType={nodeData.type} 
                        executionResult={executionResult} 
                      />
                    </div>
                  ),
                }] : []),
                {
                  key: 'schema',
                  label: (
                    <Space>
                      <FileTextOutlined />
                      Schema
                    </Space>
                  ),
                  children: renderSchemaView(outputData.schema || (outputData as any).analysis?.structure),
                },
                {
                  key: 'table',
                  label: (
                    <Space>
                      <TableOutlined />
                      Table
                    </Space>
                  ),
                  children: renderTableView(outputData),
                },
                {
                  key: 'json',
                  label: (
                    <Space>
                      <CodeOutlined />
                      JSON
                    </Space>
                  ),
                  children: (
                    <div>
                      {executionResult && executionResult.file_path && (
                        <>
                          <div style={{ marginBottom: '12px' }}>
                            <Descriptions column={1} size="small" bordered>
                              <Descriptions.Item label="文件路径">
                                {executionResult.file_path}
                              </Descriptions.Item>
                            </Descriptions>
                          </div>
                          <Divider />
                        </>
                      )}
                      <div>
                        <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                          {executionResult?.generated_workflow ? '生成的工作流定义：' : 
                           executionResult?.analysis ? '结构分析结果：' :
                           executionResult?.editor_config ? '编辑器配置：' :
                           executionResult?.smart_edit_result ? '智能编辑结果：' :
                           (executionResult?.chat_model_response || executionResult?.ai_agent_output) ? 'AI Agent 回答（来自 Chat Model）：' :
                           '解析后的数据：'}
                        </Text>
                        {nodeData?.type === 'ai_agent' && (executionResult?.chat_model_response || executionResult?.ai_agent_output) ? (
                          <div>
                            {/* 显示 Chat Model 的原始回答 */}
                            <div style={{ marginBottom: '16px' }}>
                              <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                                Chat Model 回答：
                              </Text>
                              <pre style={{ 
                                background: '#f5f5f5', 
                                padding: '12px', 
                                borderRadius: '4px', 
                                overflow: 'auto',
                                maxHeight: '400px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                width: '100%'
                              }}>
                                {executionResult.ai_agent_output || executionResult.chat_model_response?.content || '无回答'}
                              </pre>
                            </div>
                            <Divider />
                            {/* 显示处理后的数据 */}
                            {executionResult.data && (
                              <div>
                                <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                                  处理后的数据（{executionResult.output_format || 'json'}格式）：
                                </Text>
                                {renderJsonView(executionResult.data)}
                              </div>
                            )}
                            <Divider />
                            {/* 显示 Chat Model 响应详情 */}
                            <div>
                              <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                                Chat Model 响应详情：
                              </Text>
                              {renderJsonView({
                                model: executionResult.chat_model_response?.model,
                                model_type: executionResult.chat_model_response?.model_type,
                                usage: executionResult.chat_model_response?.usage,
                              })}
                            </div>
                          </div>
                        ) : (
                          renderJsonView(
                            executionResult?.generated_workflow || 
                            executionResult?.analysis || 
                            executionResult?.editor_config ||
                            executionResult?.smart_edit_result ||
                            { data: outputData.data, schema: outputData.schema }
                          )
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'xml',
                  label: (
                    <Space>
                      <FileOutlined />
                      XML
                    </Space>
                  ),
                  children: renderXmlView(outputData),
                },
                ...(executionResult?.generated_workflow ? [{
                  key: 'workflow',
                  label: (
                    <Space>
                      <FileSyncOutlined />
                      工作流
                    </Space>
                  ),
                  children: (
                    <div>
                      <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                        {executionResult.generated_workflow.workflow_name || '生成的工作流'}
                      </Text>
                      <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
                        {executionResult.generated_workflow.workflow_description || ''}
                      </Text>
                      <Divider />
                      <Text strong style={{ marginBottom: '8px', display: 'block' }}>节点列表：</Text>
                      {renderJsonView(executionResult.generated_workflow.nodes || [])}
                      <Divider style={{ marginTop: '16px' }} />
                      <Text strong style={{ marginBottom: '8px', display: 'block' }}>连接关系：</Text>
                      {renderJsonView(executionResult.generated_workflow.edges || [])}
                    </div>
                  ),
                }] : []),
              ]}
            />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8c8c8c' }}>
              <Text>暂无输出数据（点击"执行节点"按钮执行后显示）</Text>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export default NodeDetailPanel

