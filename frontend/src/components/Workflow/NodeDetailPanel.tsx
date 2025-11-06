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

  // 限制显示内容长度（前5000字符）
  const displayContent = content.length > 5000 ? content.substring(0, 5000) + '...' : content
  const maxLines = 20

  return (
    <pre style={{
      background: '#f5f5f5',
      padding: '12px',
      borderRadius: '4px',
      overflow: 'auto',
      maxHeight: `${maxLines * 1.5}em`,
      fontSize: '11px',
      fontFamily: 'monospace',
      lineHeight: '1.5',
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    }}>
      {displayContent}
      {content.length > 5000 && (
        <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '10px' }}>
          文件过长，仅显示前 5000 字符（共 {content.length} 字符）
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
    default:
      // 对于非触发节点，如果有上游数据，返回上游数据
      if (upstreamResult) {
        return {
          data: upstreamResult.data,
          schema: upstreamResult.schema,
          file_path: upstreamResult.file_path,
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

// 模拟输出数据
const getMockOutputData = (nodeType: NodeType) => {
  switch (nodeType) {
    case 'parse_file':
      return {
        schema: {
          type: 'object',
          properties: {
            parsed_data: { type: 'object' },
            file_type: { type: 'string' }
          }
        },
        data: {
          parsed_data: {
            name: '解析后的数据',
            items: ['item1', 'item2']
          },
          file_type: 'xml'
        }
      }
    case 'analyze_schema':
      return {
        schema: {
          type: 'object',
          properties: {
            schema_analysis: { type: 'object' },
            depth: { type: 'number' }
          }
        },
        data: {
          schema_analysis: {
            structure: 'nested',
            complexity: 'medium'
          },
          depth: 3
        }
      }
    default:
      return {
        schema: {
          type: 'object',
          properties: {
            result: { type: 'any' }
          }
        },
        data: {
          result: '处理后的数据'
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
}: NodeDetailPanelProps) => {
  const [form] = Form.useForm()
  const [activeInputTab, setActiveInputTab] = useState<'schema' | 'table' | 'json'>('schema')
  const [activeOutputTab, setActiveOutputTab] = useState<'schema' | 'table' | 'json' | 'workflow' | 'validation'>('validation')
  const [activeConfigTab, setActiveConfigTab] = useState<'parameters' | 'settings'>('parameters')
  // 用于跟踪文件路径，确保显示
  const [filePathValue, setFilePathValue] = useState<string>('')
  // 节点执行相关状态
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ParsedFile | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  // 当前配置值（从表单获取，用于实时更新INPUT显示）
  const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({})

  // INPUT 数据：只显示输入（来自上游节点）
  // 对于触发节点，显示配置；对于非触发节点，显示上游节点的输出
  const inputData = nodeData ? getInputData(nodeData.type, currentConfig, upstreamResult) : null
  
  // OUTPUT 数据：只显示当前节点的执行结果（不包含上游数据）
  // 执行后，显示当前节点新增的数据（如 analysis, editor_config 等）
  const outputData = executionResult ? {
    // 根据节点类型显示不同的输出
    ...(nodeData?.type === 'parse_file' ? {
      data: executionResult.data,
      schema: executionResult.schema,
      file_path: executionResult.file_path,
    } : {}),
    ...(nodeData?.type === 'analyze_xml_structure' ? {
      analysis: executionResult.analysis,
    } : {}),
    ...(nodeData?.type === 'generate_editor_config' ? {
      editor_config: executionResult.editor_config,
    } : {}),
    ...(nodeData?.type === 'smart_edit' ? {
      smart_edit_result: executionResult.smart_edit_result,
    } : {}),
    ...(nodeData?.type === 'generate_workflow' ? {
      generated_workflow: executionResult.generated_workflow,
    } : {}),
    // 通用输出（如果节点执行后没有特定输出，显示通用数据）
    ...(nodeData?.type !== 'parse_file' && 
        nodeData?.type !== 'analyze_xml_structure' && 
        nodeData?.type !== 'generate_editor_config' &&
        nodeData?.type !== 'smart_edit' &&
        nodeData?.type !== 'generate_workflow' ? {
      data: executionResult.data,
      schema: executionResult.schema,
    } : {}),
  } : null
  
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
      form.setFieldsValue({
        label: nodeData.label,
        description: nodeData.description || '',
        ...config,
      })
      // 同步文件路径状态和当前配置
      setFilePathValue(initialFilePath)
      setCurrentConfig(config)
      // 如果上游节点有执行结果，使用上游结果；否则重置
      if (upstreamResult) {
        console.log(`[NodeDetailPanel useEffect] 设置上游结果到 executionResult，节点ID: ${_nodeId}`)
        setExecutionResult(upstreamResult)
      } else {
        console.log(`[NodeDetailPanel useEffect] 没有上游结果，重置 executionResult，节点ID: ${_nodeId}`)
        setExecutionResult(null)
      }
      setExecutionError(null)
    }
  }, [open, nodeData, form, upstreamResult, _nodeId])

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
      const { label, description, ...restConfig } = values
      onSave({
        label,
        description,
        config: restConfig,
      })
      onClose()
    } catch (error) {
      console.error('表单验证失败:', error)
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
        setExecutionError(result.error || '执行失败')
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
      case 'export_file':
        return (
          <>
            <Form.Item name="output_format" label="导出格式">
              <Select defaultValue="json">
                <Select.Option value="json">JSON</Select.Option>
                <Select.Option value="xml">XML</Select.Option>
                <Select.Option value="yaml">YAML</Select.Option>
                <Select.Option value="csv">CSV</Select.Option>
                <Select.Option value="excel">Excel</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item 
              name="output_path" 
              label="输出路径"
              rules={[{ required: true, message: '请选择或输入输出路径' }]}
            >
              <Input.Group compact>
                <Input
                  style={{ width: 'calc(100% - 40px)' }}
                  placeholder="例如: data/exports/output"
                />
                <Button
                  type="default"
                  icon={<FolderOpenOutlined />}
                  onClick={() => handleFileSelect('output_path')}
                  style={{ width: '40px' }}
                />
              </Input.Group>
            </Form.Item>
            <Form.Item name="pretty_print" label="格式化输出" valuePropName="checked">
              <Switch defaultChecked />
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                XML/JSON/YAML格式时，美化输出（格式化、缩进）
              </div>
            </Form.Item>
            <Form.Item 
              name="sort_by" 
              label="排序字段（可选）"
              tooltip="XML格式支持：按字段排序，例如 @attributes.id 表示按id属性排序"
            >
              <Input placeholder="例如: @attributes.id（仅XML格式支持）" />
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
      case 'memory': {
        const ConfigComponent = getNodeConfigComponent(nodeData.type)
        if (ConfigComponent) {
          return (
            <ConfigComponent
              form={form}
              filePathValue={filePathValue}
              setFilePathValue={setFilePathValue}
              onFileSelect={handleFileSelect}
              onConfigChange={updateCurrentConfig}
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
    if (!data || !data.data) return <Text type="secondary">暂无数据</Text>
    
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
        maxHeight: '400px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        {JSON.stringify(data, null, 2)}
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
      width="90%"
      style={{ maxWidth: '1400px' }}
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
                          <Descriptions.Item label="文件类型">
                            <Text>{executionResult.file_path.split('.').pop()?.toUpperCase() || '未知'}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="数据项数">
                            <Text>{executionResult.data ? (Array.isArray(executionResult.data) ? executionResult.data.length : Object.keys(executionResult.data).length) : 0}</Text>
                          </Descriptions.Item>
                        </Descriptions>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <Title level={5} style={{ marginBottom: '8px', fontSize: '14px' }}>源文件内容</Title>
                        <FileContentPreview filePath={executionResult.file_path} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : inputData ? (
            <Tabs
              activeKey={activeInputTab}
              onChange={(key) => setActiveInputTab(key as 'schema' | 'table' | 'json')}
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
              <div style={{ color: '#ff4d4f', marginBottom: '12px' }}>
                <Text strong>执行失败</Text>
              </div>
              <Text type="danger">{executionError}</Text>
            </div>
          ) : outputData && executionResult ? (
            <Tabs
              activeKey={activeOutputTab}
              onChange={(key) => setActiveOutputTab(key as 'schema' | 'table' | 'json' | 'workflow' | 'validation')}
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
                          {executionResult.generated_workflow ? '生成的工作流定义：' : 
                           executionResult.analysis ? '结构分析结果：' :
                           executionResult.editor_config ? '编辑器配置：' :
                           executionResult.smart_edit_result ? '智能编辑结果：' :
                           '解析后的数据：'}
                        </Text>
                        {renderJsonView(
                          executionResult.generated_workflow || 
                          executionResult.analysis || 
                          executionResult.editor_config ||
                          executionResult.smart_edit_result ||
                          { data: outputData.data, schema: outputData.schema }
                        )}
                      </div>
                    </div>
                  ),
                },
                ...(executionResult.generated_workflow ? [{
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

