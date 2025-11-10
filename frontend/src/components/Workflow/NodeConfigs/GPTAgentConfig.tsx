/**
 * GPT Agent 节点配置组件
 * 合并 AIAgent 和 ChatModel 功能，支持 ChatGPT Responses API 完整特性
 */
import React, { useState } from 'react'
import { Form, Input, Select, Switch, Card, Alert, Space, Button, Tabs, message } from 'antd'
import { InfoCircleOutlined, BulbOutlined, DatabaseOutlined, ToolOutlined, PlusOutlined, DeleteOutlined, KeyOutlined, ApiOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Option } = Select

const GPTAgentConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
  nodes = [],
  edges = [],
  nodeId,
}) => {
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 获取连接的节点信息
  const getConnectedNodeInfo = (targetHandle: string) => {
    if (!nodeId) return null
    
    const edge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === targetHandle
    )
    if (!edge) return null
    
    const node = nodes.find((n) => n.id === edge.source)
    if (!node) return null
    
    return {
      id: node.id,
      type: node.data?.type || node.type,
      label: node.data?.label || node.label || node.id,
    }
  }
  
  // 获取节点类型的中文名称
  const getNodeTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      memory: 'Memory',
      tool: 'Tool',
      code_tool: '代码工具',
    }
    return typeNames[type] || type
  }

  // 检测连接状态（在组件挂载和更新时）
  React.useEffect(() => {
    if (nodeId) {
      const memoryConnected = !!getConnectedNodeInfo('memory')
      const toolConnected = !!getConnectedNodeInfo('tool')
      
      form.setFieldsValue({
        config: {
          ...form.getFieldValue('config'),
          memory_connected: memoryConnected,
          tool_connected: toolConnected,
        },
      })
      onConfigChange?.()
    }
  }, [nodeId, edges, nodes])

  // 设置默认值（只在配置为空时设置，不覆盖已有配置）
  React.useEffect(() => {
    const currentConfig = form.getFieldValue('config') || {}
    const defaultConfig = {
      api_url: 'https://api.openai.com/v1/responses',
      model: 'gpt-5',
      temperature: 0.7,
      max_tokens: 2000,
      output_format: 'json',
      timeout: 60,
      max_retries: 3,
      data_processing_mode: 'smart',
      sample_strategy: 'single_item', // 默认使用单子项采样，适用于XML结构分析
      max_data_tokens: 4000,
      file_purpose: 'user_data',
      use_memory: false,
      use_tool: false,
      memory_connected: false,
      tool_connected: false,
    }
    
    // 合并默认值，保留已有配置（但 api_key 不设置默认值，必须由用户填写）
    // 重要：只设置缺失的字段，不覆盖已有字段（如 system_prompt, instructions）
    const mergedConfig: Record<string, any> = { ...defaultConfig }
    Object.keys(mergedConfig).forEach(key => {
      if (currentConfig[key] !== undefined && currentConfig[key] !== null && currentConfig[key] !== '') {
        // 如果已有配置中有值，保留它
        mergedConfig[key] = currentConfig[key]
      }
    })
    // 保留所有其他已有字段（如 system_prompt, instructions, api_key 等）
    const finalConfig = { ...mergedConfig, ...currentConfig }
    
    // 只有当配置为空或缺少关键字段时才设置（但保留所有已有字段）
    if (!currentConfig.api_url || !currentConfig.model) {
      form.setFieldsValue({
        config: finalConfig,
      })
      onConfigChange?.()
    }
  }, [form, onConfigChange])

  // 获取输入内容项列表
  const getInputContent = (): Array<{
    type: 'input_text' | 'input_image' | 'input_file'
    text?: string
    image_url?: string
    file_url?: string
    file_id?: string
  }> => {
    const content = form.getFieldValue(['config', 'input_content']) || []
    return Array.isArray(content) ? content : []
  }

  // 添加输入内容项
  const addInputContent = (type: 'input_text' | 'input_image' | 'input_file') => {
    const content = getInputContent()
    const newItem: any = { type }
    if (type === 'input_text') {
      newItem.text = ''
    } else if (type === 'input_image') {
      newItem.image_url = ''
    } else if (type === 'input_file') {
      newItem.file_url = ''
    }
    content.push(newItem)
    form.setFieldValue(['config', 'input_content'], content)
    onConfigChange?.()
  }

  // 删除输入内容项
  const removeInputContent = (index: number) => {
    const content = getInputContent()
    content.splice(index, 1)
    form.setFieldValue(['config', 'input_content'], content)
    onConfigChange?.()
  }

  // 更新输入内容项
  const updateInputContent = (index: number, field: string, value: any) => {
    const content = getInputContent()
    content[index] = { ...content[index], [field]: value }
    form.setFieldValue(['config', 'input_content'], content)
    onConfigChange?.()
  }

  // 获取 MCP 服务器列表
  const getMCPServers = (): Array<{
    type: string
    server_label: string
    server_description: string
    server_url: string
    require_approval: string
  }> => {
    const servers = form.getFieldValue(['config', 'mcp_servers']) || []
    return Array.isArray(servers) ? servers : []
  }

  // 添加 MCP 服务器
  const addMCPServer = () => {
    const servers = getMCPServers()
    servers.push({
      type: 'mcp',
      server_label: '',
      server_description: '',
      server_url: '',
      require_approval: 'never',
    })
    form.setFieldValue(['config', 'mcp_servers'], servers)
    onConfigChange?.()
  }

  // 删除 MCP 服务器
  const removeMCPServer = (index: number) => {
    const servers = getMCPServers()
    servers.splice(index, 1)
    form.setFieldValue(['config', 'mcp_servers'], servers)
    onConfigChange?.()
  }

  // 更新 MCP 服务器
  const updateMCPServer = (index: number, field: string, value: any) => {
    const servers = getMCPServers()
    servers[index] = { ...servers[index], [field]: value }
    form.setFieldValue(['config', 'mcp_servers'], servers)
    onConfigChange?.()
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message="GPT Agent 节点说明"
        description={
          <div>
            <p>GPT Agent 是一个强大的 AI 代理节点，合并了 AIAgent 和 ChatModel 的功能，支持 ChatGPT Responses API 的所有特性：</p>
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li><strong>多模态输入</strong>：支持文字、图片、文件内容输入</li>
              <li><strong>文件上传</strong>：支持上传文件到 OpenAI Files API</li>
              <li><strong>MCP 服务</strong>：支持远程调用 MCP 服务</li>
              <li><strong>多 Agent 协作</strong>：支持多个 Agent 之间的协作和转交</li>
              <li><strong>数据处理</strong>：智能处理输入数据，生成结构化输出</li>
            </ul>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'basic',
            label: '基本配置',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* API 配置 */}
                <Card title={<Space><KeyOutlined /><span>API 配置</span></Space>} size="small">
                  <Form.Item
                    name={['config', 'api_key']}
                    label="API Key"
                    rules={[{ required: true, message: '请输入 API Key' }]}
                    tooltip="OpenAI API Key，用于调用 ChatGPT API"
                  >
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      suffix={
                        <Button
                          type="text"
                          icon={showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          onClick={() => setShowApiKey(!showApiKey)}
                          style={{ padding: 0, width: 'auto' }}
                        />
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'api_url']}
                    label={<Space><ApiOutlined /><span>API 地址</span></Space>}
                    initialValue="https://api.openai.com/v1/responses"
                    rules={[{ required: true, message: '请输入 API 地址' }]}
                  >
                    <Input placeholder="https://api.openai.com/v1/responses" />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'model']}
                    label="模型版本"
                    initialValue="gpt-5"
                    tooltip="推荐使用 gpt-5 或 gpt-5-nano"
                  >
                    <Select>
                      <Option value="gpt-5">GPT-5（推荐，需要配额）</Option>
                      <Option value="gpt-5-nano">GPT-5 Nano（快速，需要配额）</Option>
                      <Option value="gpt-4o">GPT-4o（高性能，推荐）</Option>
                      <Option value="gpt-4o-mini">GPT-4o Mini（经济实惠）</Option>
                      <Option value="gpt-4">GPT-4（经典模型）</Option>
                      <Option value="gpt-3.5-turbo">GPT-3.5 Turbo（最经济）</Option>
                    </Select>
                  </Form.Item>
                </Card>

                {/* 系统提示词 */}
                <Card title={<Space><BulbOutlined /><span>系统提示词</span></Space>} size="small">
                  <Alert
                    message="XML 结构分析模板"
                    description={
                      <div>
                        <p style={{ marginBottom: 8 }}>点击下方按钮快速填充 XML 结构分析的系统提示词和高级指令模板：</p>
                        <Button
                          type="dashed"
                          size="small"
                          onClick={() => {
                            const xmlSystemPrompt = `你是一个专业的 XML 结构分析专家。你的任务是分析 XML 文件的结构，提取关键信息，并生成详细的 Schema 分析报告。

## 你的职责

1. **提取所有元素和属性**
   - 识别 XML 中的所有元素（Element）
   - 识别所有属性（Attribute）
   - 识别文本内容（Text Content）

2. **识别数据类型**
   - 字符串（string）：普通文本内容
   - 数字（number）：整数或浮点数
   - 布尔值（boolean）：true/false
   - 枚举（enum）：有限的可选值列表
   - 日期时间（datetime）：日期或时间格式
   - 对象（object）：嵌套的复杂结构
   - 数组（array）：重复的元素列表

3. **识别数据范围**
   - 枚举值：列出所有可能的值（如 culture: ["Culture.aserai", "Culture.neutral_culture", "Culture.khuzait"]）
   - 数值范围：最小值和最大值（如 weight: {min: 0, max: 100}）
   - 字符串长度：最小长度和最大长度
   - 正则表达式：如果存在模式匹配

4. **识别嵌套关系**
   - 识别父子关系
   - 识别兄弟关系
   - 识别层级深度

5. **识别字段约束**
   - 必填字段（required）：必须存在的字段
   - 可选字段（optional）：可能不存在的字段
   - 默认值（default）：字段的默认值
   - 唯一性约束（unique）：字段值必须唯一

## 输出要求

请生成详细的 Schema 分析报告，输出格式为 JSON，包含以下结构：

\`\`\`json
{
  "root_element": "根元素名称",
  "structure": {
    "元素名": {
      "type": "数据类型",
      "required": true/false,
      "description": "字段描述",
      "attributes": {
        "属性名": {
          "type": "数据类型",
          "required": true/false,
          "values": ["枚举值1", "枚举值2"],
          "range": {"min": 0, "max": 100},
          "description": "属性描述"
        }
      },
      "children": {
        "子元素名": {
          // 递归结构
        }
      }
    }
  },
  "statistics": {
    "total_items": 总数,
    "unique_values": {
      "字段名": ["值1", "值2"]
    }
  }
}
\`\`\`

请确保分析结果准确、完整，能够用于生成编辑器配置。`

                            const xmlInstructions = `分析 XML 结构时，请遵循以下原则：

1. **完整性**：确保提取所有字段、属性和嵌套结构
2. **准确性**：准确识别数据类型和取值范围
3. **详细性**：为每个字段提供清晰的描述
4. **结构化**：输出格式必须符合 JSON Schema 规范
5. **可扩展性**：考虑未来可能的数据变化

如果只提供了一个代表性子项，请根据该子项推断整个 XML 文件的结构，包括：
- 所有可能的字段和属性
- 所有可能的枚举值
- 合理的数值范围
- 字段的必填/可选状态`

                            // 获取当前配置，保留所有已有字段
                            const currentConfig = form.getFieldValue('config') || {}
                            form.setFieldsValue({
                              config: {
                                ...currentConfig,  // 保留所有已有配置
                                system_prompt: xmlSystemPrompt,
                                instructions: xmlInstructions,
                              },
                            })
                            onConfigChange?.()
                            message.success('已填充 XML 结构分析模板')
                          }}
                        >
                          填充 XML 结构分析模板
                        </Button>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    name={['config', 'system_prompt']}
                    label="系统提示词"
                    tooltip="定义 GPT Agent 的角色、能力和行为准则。对于 XML 结构分析，建议使用模板。"
                  >
                    <TextArea
                      rows={8}
                      placeholder="例如：你是一个专业的 XML 结构分析专家。你的任务是分析 XML 文件的结构，提取关键信息，并生成详细的 Schema 分析报告。"
                      onChange={onConfigChange}
                    />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'instructions']}
                    label="Instructions（高级指令）"
                    tooltip="可重用提示词模板，优先级高于系统提示词。用于 XML 结构分析时，可以指定分析原则和输出格式要求。"
                  >
                    <TextArea
                      rows={4}
                      placeholder="例如：分析 XML 结构时，请确保提取所有字段、属性和嵌套结构，准确识别数据类型和取值范围，输出格式必须符合 JSON Schema 规范。"
                      onChange={onConfigChange}
                    />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'reasoning']}
                    label="启用推理模式"
                    valuePropName="checked"
                    tooltip="仅适用于 Reasoning Models（如 gpt-5）"
                  >
                    <Switch onChange={onConfigChange} />
                  </Form.Item>
                </Card>

                {/* 输入内容配置 */}
                <Card title="输入内容配置" size="small">
                  <Alert
                    message="多模态输入"
                    description="支持文字、图片、文件内容输入。可以添加多个输入项。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  {getInputContent().map((item, index) => (
                    <Card
                      key={index}
                      size="small"
                      style={{ marginBottom: 12 }}
                      title={
                        <Space>
                          <span>{item.type === 'input_text' ? '文字' : item.type === 'input_image' ? '图片' : '文件'}</span>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeInputContent(index)}
                          />
                        </Space>
                      }
                    >
                      {item.type === 'input_text' && (
                        <Form.Item label="文本内容">
                          <TextArea
                            value={item.text}
                            onChange={(e) => updateInputContent(index, 'text', e.target.value)}
                            rows={3}
                            placeholder="输入文本内容"
                          />
                        </Form.Item>
                      )}
                      {item.type === 'input_image' && (
                        <Form.Item label="图片 URL">
                          <Input
                            value={item.image_url}
                            onChange={(e) => updateInputContent(index, 'image_url', e.target.value)}
                            placeholder="https://example.com/image.jpg"
                          />
                        </Form.Item>
                      )}
                      {item.type === 'input_file' && (
                        <>
                          <Form.Item label="文件 URL">
                            <Input
                              value={item.file_url}
                              onChange={(e) => updateInputContent(index, 'file_url', e.target.value)}
                              placeholder="https://example.com/file.pdf"
                            />
                          </Form.Item>
                          <Form.Item label="文件 ID（已上传）">
                            <Input
                              value={item.file_id}
                              onChange={(e) => updateInputContent(index, 'file_id', e.target.value)}
                              placeholder="file_abc123"
                            />
                          </Form.Item>
                        </>
                      )}
                    </Card>
                  ))}

                  <Space>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => addInputContent('input_text')}
                    >
                      添加文字
                    </Button>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => addInputContent('input_image')}
                    >
                      添加图片
                    </Button>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => addInputContent('input_file')}
                    >
                      添加文件
                    </Button>
                  </Space>
                </Card>

                {/* 文件上传配置 */}
                <Card title="文件上传配置" size="small">
                  <Form.Item
                    name={['config', 'file_path']}
                    label="文件路径"
                    tooltip="本地文件路径，将上传到 OpenAI Files API"
                  >
                    <Input placeholder="/path/to/file.pdf" />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'file_purpose']}
                    label="文件用途"
                    initialValue="user_data"
                    tooltip="user_data: 用户数据文件, assistant: 助手文件"
                  >
                    <Select>
                      <Option value="user_data">User Data（用户数据）</Option>
                      <Option value="assistant">Assistant（助手文件）</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Space>
            ),
          },
          {
            key: 'advanced',
            label: '高级配置',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* MCP 服务配置 */}
                <Card title="MCP 服务配置" size="small">
                  <Alert
                    message="MCP 服务"
                    description="支持远程调用 MCP（Model Context Protocol）服务，扩展 GPT Agent 的功能。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  {getMCPServers().map((server, index) => (
                    <Card
                      key={index}
                      size="small"
                      style={{ marginBottom: 12 }}
                      title={
                        <Space>
                          <span>MCP 服务器 {index + 1}</span>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeMCPServer(index)}
                          />
                        </Space>
                      }
                    >
                      <Form.Item label="服务器标签">
                        <Input
                          value={server.server_label}
                          onChange={(e) => updateMCPServer(index, 'server_label', e.target.value)}
                          placeholder="dmcp"
                        />
                      </Form.Item>
                      <Form.Item label="服务器描述">
                        <TextArea
                          value={server.server_description}
                          onChange={(e) => updateMCPServer(index, 'server_description', e.target.value)}
                          rows={2}
                          placeholder="A Dungeons and Dragons MCP server to assist with dice rolling."
                        />
                      </Form.Item>
                      <Form.Item label="服务器 URL">
                        <Input
                          value={server.server_url}
                          onChange={(e) => updateMCPServer(index, 'server_url', e.target.value)}
                          placeholder="https://dmcp-server.deno.dev/sse"
                        />
                      </Form.Item>
                      <Form.Item label="需要批准">
                        <Select
                          value={server.require_approval}
                          onChange={(value) => updateMCPServer(index, 'require_approval', value)}
                        >
                          <Option value="never">Never（不需要）</Option>
                          <Option value="always">Always（总是需要）</Option>
                          <Option value="on_first_use">On First Use（首次使用需要）</Option>
                        </Select>
                      </Form.Item>
                    </Card>
                  ))}

                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addMCPServer}
                    block
                  >
                    添加 MCP 服务器
                  </Button>
                </Card>

                {/* 数据处理配置 */}
                <Card title="数据处理配置" size="small">
                  <Form.Item
                    name={['config', 'data_processing_mode']}
                    label="数据处理模式"
                    initialValue="smart"
                    tooltip="选择如何处理输入数据，避免超过Token限制"
                  >
                    <Select onChange={onConfigChange}>
                      <Option value="direct">直接传递</Option>
                      <Option value="smart">智能采样（推荐）</Option>
                      <Option value="limit">限制数量</Option>
                      <Option value="summary">摘要模式</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name={['config', 'max_data_tokens']}
                    label="数据Token限制"
                    tooltip="限制输入数据的最大Token数量（建议：2000-8000）"
                    initialValue={4000}
                  >
                    <Input type="number" min={500} max={50000} onChange={onConfigChange} />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'sample_strategy']}
                    label="采样策略"
                    initialValue="head_tail"
                    tooltip="采样策略：single_item（单子项，适用于XML结构分析，节省token）、diverse（多样化采样）、head_tail（首尾采样）、uniform（均匀采样）、head（仅开头）、random（随机采样）"
                  >
                    <Select onChange={onConfigChange}>
                      <Option value="single_item">单子项采样（XML结构分析推荐）</Option>
                      <Option value="diverse">多样化采样</Option>
                      <Option value="head_tail">首尾采样</Option>
                      <Option value="uniform">均匀采样</Option>
                      <Option value="head">仅开头</Option>
                      <Option value="random">随机采样</Option>
                    </Select>
                  </Form.Item>
                </Card>

                {/* 输出配置 */}
                <Card title="输出配置" size="small">
                  <Form.Item
                    name={['config', 'output_format']}
                    label="输出格式"
                    initialValue="json"
                  >
                    <Select onChange={onConfigChange}>
                      <Option value="json">JSON 格式</Option>
                      <Option value="text">文本格式</Option>
                      <Option value="structured">结构化数据</Option>
                      <Option value="markdown">Markdown 格式</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name={['config', 'temperature']}
                    label="Temperature"
                    initialValue={0.7}
                    tooltip="控制回复的随机性"
                  >
                    <Input type="number" min={0} max={2} step={0.1} onChange={onConfigChange} />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'max_tokens']}
                    label="最大输出长度 (Tokens)"
                    initialValue={2000}
                  >
                    <Input type="number" min={100} max={8000} onChange={onConfigChange} />
                  </Form.Item>
                </Card>

                {/* 请求配置 */}
                <Card title="请求配置" size="small">
                  <Form.Item
                    name={['config', 'timeout']}
                    label="请求超时（秒）"
                    initialValue={60}
                  >
                    <Input type="number" min={10} max={300} onChange={onConfigChange} />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'max_retries']}
                    label="最大重试次数"
                    initialValue={3}
                  >
                    <Input type="number" min={0} max={10} onChange={onConfigChange} />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'request_headers']}
                    label="请求头 (JSON)"
                    tooltip="自定义请求头，JSON 格式"
                  >
                    <TextArea
                      rows={4}
                      placeholder='{"Content-Type": "application/json"}'
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                      onChange={onConfigChange}
                    />
                  </Form.Item>
                </Card>

                {/* Memory 配置（外接 Memory 节点） */}
                <Card title={<Space><DatabaseOutlined /><span>Memory 配置（外接节点）</span></Space>} size="small">
                  <Alert
                    message="Memory 节点连接"
                    description="连接 Memory 节点可以存储和检索上下文信息、对话历史等。从 GPT Agent 节点底部的 Memory 端口（💾）连接 Memory 节点。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    name={['config', 'use_memory']}
                    label="启用记忆功能"
                    valuePropName="checked"
                    tooltip="如果连接了 Memory 节点，启用此选项可以存储和检索上下文信息"
                    initialValue={false}
                  >
                    <Switch onChange={onConfigChange} />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.config?.use_memory !== currentValues.config?.use_memory
                    }
                  >
                    {({ getFieldValue }) => {
                      const useMemory = getFieldValue(['config', 'use_memory'])
                      if (!useMemory) return null

                      return (
                        <>
                          <Form.Item
                            name={['config', 'memory_config', 'memory_strategy']}
                            label="记忆策略"
                            tooltip="选择如何使用记忆：自动存储所有对话、只存储关键信息、或手动控制"
                            initialValue="auto"
                          >
                            <Select onChange={onConfigChange}>
                              <Option value="auto">自动存储 - 存储所有输入和输出</Option>
                              <Option value="key_only">关键信息 - 只存储重要信息</Option>
                              <Option value="manual">手动控制 - 通过代码控制存储</Option>
                            </Select>
                          </Form.Item>

                          <Form.Item
                            name={['config', 'memory_config', 'memory_type']}
                            label="记忆类型"
                            tooltip="选择记忆存储的类型：工作流级（仅在当前工作流有效）、会话级（跨工作流但临时）、全局级（永久存储）"
                            initialValue="workflow"
                          >
                            <Select onChange={onConfigChange}>
                              <Option value="workflow">工作流级 - 仅当前工作流</Option>
                              <Option value="session">会话级 - 跨工作流临时</Option>
                              <Option value="global">全局级 - 永久存储</Option>
                            </Select>
                          </Form.Item>

                          <Form.Item
                            name={['config', 'memory_config', 'memory_ttl']}
                            label="记忆过期时间 (秒)"
                            tooltip="设置记忆的过期时间，0表示永不过期"
                            initialValue={0}
                          >
                            <Input
                              type="number"
                              min={0}
                              placeholder="0 表示永不过期"
                              onChange={onConfigChange}
                            />
                          </Form.Item>
                        </>
                      )
                    }}
                  </Form.Item>

                  <Form.Item
                    name={['config', 'memory_connected']}
                    label="Memory 连接状态"
                    tooltip="是否已连接 Memory 节点（可选）"
                  >
                    <Select disabled>
                      <Option value={true}>✓ 已连接</Option>
                      <Option value={false}>✗ 未连接</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.config?.memory_connected !== currentValues.config?.memory_connected
                    }
                  >
                    {({ getFieldValue }) => {
                      const memoryConnected = getFieldValue(['config', 'memory_connected'])
                      const memoryNode = getConnectedNodeInfo('memory')
                      
                      if (!memoryConnected || !memoryNode) {
                        return (
                          <Alert
                            message="未连接 Memory 节点"
                            description="请从 GPT Agent 节点底部的 Memory 端口（💾）连接 Memory 节点。"
                            type="warning"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        )
                      }
                      
                      const nodeTypeName = getNodeTypeName(memoryNode.type)
                      const nodeLabel = memoryNode.label || memoryNode.id
                      
                      return (
                        <Alert
                          message="Memory 节点已连接"
                          description={
                            <div>
                              <div>已连接到：<strong>{nodeTypeName}</strong> ({nodeLabel})</div>
                              <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                                请确保在连接的 Memory 节点中配置了正确的操作和存储类型。
                              </div>
                            </div>
                          }
                          type="success"
                          showIcon
                          style={{ marginTop: 8 }}
                        />
                      )
                    }}
                  </Form.Item>
                </Card>

                {/* Tool 配置（外接 Tool 节点） */}
                <Card title={<Space><ToolOutlined /><span>Tool 配置（外接节点）</span></Space>} size="small">
                  <Alert
                    message="Tool 节点连接"
                    description="连接 Tool 节点（如代码工具）可以扩展 GPT Agent 的功能。从 GPT Agent 节点底部的 Tool 端口（🔧）连接 Tool 节点。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    name={['config', 'use_tool']}
                    label="启用工具功能"
                    valuePropName="checked"
                    tooltip="如果连接了 Tool 节点，启用此选项可以使用工具功能"
                    initialValue={false}
                  >
                    <Switch onChange={onConfigChange} />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'tool_connected']}
                    label="Tool 连接状态"
                    tooltip="是否已连接 Tool 节点（可选）"
                  >
                    <Select disabled>
                      <Option value={true}>✓ 已连接</Option>
                      <Option value={false}>✗ 未连接</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.config?.tool_connected !== currentValues.config?.tool_connected
                    }
                  >
                    {({ getFieldValue }) => {
                      const toolConnected = getFieldValue(['config', 'tool_connected'])
                      const toolNode = getConnectedNodeInfo('tool')
                      
                      if (!toolConnected || !toolNode) {
                        return (
                          <Alert
                            message="未连接 Tool 节点"
                            description="请从 GPT Agent 节点底部的 Tool 端口（🔧）连接 Tool 节点（如代码工具）。"
                            type="warning"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        )
                      }
                      
                      const nodeTypeName = getNodeTypeName(toolNode.type)
                      const nodeLabel = toolNode.label || toolNode.id
                      
                      return (
                        <Alert
                          message="Tool 节点已连接"
                          description={
                            <div>
                              <div>已连接到：<strong>{nodeTypeName}</strong> ({nodeLabel})</div>
                              <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                                请确保在连接的 Tool 节点中配置了正确的工具函数。
                              </div>
                            </div>
                          }
                          type="success"
                          showIcon
                          style={{ marginTop: 8 }}
                        />
                      )
                    }}
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.config?.use_tool !== currentValues.config?.use_tool
                    }
                  >
                    {({ getFieldValue }) => {
                      const useTool = getFieldValue(['config', 'use_tool'])
                      if (!useTool) return null

                      return (
                        <Form.Item
                          name={['config', 'tool_config', 'tool_type']}
                          label="工具类型"
                          tooltip="选择工具类型：代码工具、API工具或自定义工具"
                        >
                          <Select onChange={onConfigChange}>
                            <Option value="code">代码工具 - 执行代码片段</Option>
                            <Option value="api">API工具 - 调用外部API</Option>
                            <Option value="custom">自定义工具 - 自定义功能</Option>
                          </Select>
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}

export default GPTAgentConfig

