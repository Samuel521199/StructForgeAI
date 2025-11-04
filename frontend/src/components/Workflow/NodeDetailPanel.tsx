import { useState, useEffect } from 'react'
import { Drawer, Form, Input, Switch, Select, Tabs, Table, Button, Space, Typography, Divider, message, Spin, Descriptions } from 'antd'
import { 
  CloseOutlined, 
  SaveOutlined, 
  PlayCircleOutlined,
  FileTextOutlined,
  TableOutlined,
  CodeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import type { NodeType } from './WorkflowNode'
import { fileApi } from '@/services/api'
import type { ParsedFile } from '@/types'
import './NodeDetailPanel.css'

const { Text, Title } = Typography

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
}

// 获取输入数据（根据节点类型和配置）
const getInputData = (nodeType: NodeType, config?: Record<string, any>) => {
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
}: NodeDetailPanelProps) => {
  const [form] = Form.useForm()
  const [activeInputTab, setActiveInputTab] = useState<'schema' | 'table' | 'json'>('schema')
  const [activeOutputTab, setActiveOutputTab] = useState<'schema' | 'table' | 'json'>('schema')
  const [activeConfigTab, setActiveConfigTab] = useState<'parameters' | 'settings'>('parameters')
  // 用于跟踪文件路径，确保显示
  const [filePathValue, setFilePathValue] = useState<string>('')
  // 节点执行相关状态
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ParsedFile | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  // 当前配置值（从表单获取，用于实时更新INPUT显示）
  const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({})

  // 根据当前配置和执行结果决定显示的数据
  const inputData = nodeData ? getInputData(nodeData.type, currentConfig) : null
  const outputData = executionResult ? {
    data: executionResult.data,
    schema: executionResult.schema,
    file_path: executionResult.file_path
  } : (nodeData ? getMockOutputData(nodeData.type) : null)

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
      // 重置执行结果
      setExecutionResult(null)
      setExecutionError(null)
    }
  }, [open, nodeData, form])

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

  // 处理节点执行
  const handleNodeExecute = async () => {
    if (!nodeData) return
    
    // 对于 parse_file 节点，需要文件路径
    if (nodeData.type === 'parse_file') {
      const filePath = form.getFieldValue('file_path')
      if (!filePath || filePath.trim() === '') {
        message.error('请先设置文件路径')
        return
      }
      
      try {
        setExecuting(true)
        setExecutionError(null)
        message.loading({ content: '正在解析文件...', key: 'execute' })
        
        // 调用文件解析API
        const result = await fileApi.parse(filePath)
        setExecutionResult(result)
        message.success({ content: '文件解析成功', key: 'execute' })
      } catch (error: any) {
        const errorMsg = error.message || '文件解析失败'
        setExecutionError(errorMsg)
        message.error({ content: errorMsg, key: 'execute' })
      } finally {
        setExecuting(false)
      }
    } else {
      message.info('该节点类型的执行功能开发中')
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
            </Form.Item>
          </>
        )
      default:
        return null
    }
  }

  const renderSchemaView = (schema: any) => {
    if (!schema) return <Text type="secondary">暂无数据</Text>
    
    const renderSchemaItem = (key: string, value: any, level = 0): JSX.Element => {
      const indent = level * 20
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <div key={key} style={{ marginLeft: indent }}>
            <Text strong>{key}:</Text> {'{'}
            <div style={{ marginLeft: 20 }}>
              {Object.entries(value).map(([k, v]) => renderSchemaItem(k, v, level + 1))}
            </div>
            {'}'}
          </div>
        )
      } else if (Array.isArray(value)) {
        return (
          <div key={key} style={{ marginLeft: indent }}>
            <Text strong>{key}:</Text> [{value.length} items]
          </div>
        )
      } else {
        return (
          <div key={key} style={{ marginLeft: indent }}>
            <Text strong>{key}:</Text> <Text type="secondary">{String(value)}</Text>
          </div>
        )
      }
    }

    return (
      <div style={{ padding: '8px 0' }}>
        {Object.entries(schema.properties || {}).map(([key, value]) => 
          renderSchemaItem(key, value, 0)
        )}
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
              <div style={{ marginBottom: '16px', textAlign: 'center', color: '#8c8c8c' }}>
                <Text>触发节点没有输入数据</Text>
              </div>
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
              onChange={(key) => setActiveOutputTab(key as 'schema' | 'table' | 'json')}
              items={[
                {
                  key: 'schema',
                  label: (
                    <Space>
                      <FileTextOutlined />
                      Schema
                    </Space>
                  ),
                  children: renderSchemaView(outputData.schema),
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
                      {executionResult && (
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
                        <Text strong style={{ marginBottom: '8px', display: 'block' }}>解析后的数据：</Text>
                        {renderJsonView({ data: outputData.data, schema: outputData.schema })}
                      </div>
                    </div>
                  ),
                },
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

