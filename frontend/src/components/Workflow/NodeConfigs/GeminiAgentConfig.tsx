/**
 * Gemini Agent 节点配置组件
 * 支持 Google Gemini API 完整特性
 */
import React, { useState } from 'react'
import { Form, Input, Select, Card, Alert, Space, Button, Tabs, message } from 'antd'
import { InfoCircleOutlined, BulbOutlined, PlusOutlined, DeleteOutlined, KeyOutlined, ApiOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Option } = Select

const GeminiAgentConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
  nodes = [],
  edges = [],
  nodeId,
}) => {
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 设置默认值（只在配置为空时设置，不覆盖已有配置）
  React.useEffect(() => {
    const currentConfig = form.getFieldValue('config') || {}
    const defaultConfig = {
      api_url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      model: 'gemini-pro',
      temperature: 0.7,
      max_tokens: 2000,
      output_format: 'json',
      timeout: 60,
      max_retries: 3,
      data_processing_mode: 'smart',
      sample_strategy: 'single_item',
      max_data_tokens: 4000,
    }
    
    const mergedConfig: Record<string, any> = { ...defaultConfig }
    Object.keys(mergedConfig).forEach(key => {
      if (currentConfig[key] !== undefined && currentConfig[key] !== null && currentConfig[key] !== '') {
        mergedConfig[key] = currentConfig[key]
      }
    })
    const finalConfig = { ...mergedConfig, ...currentConfig }
    
    if (!currentConfig.api_url || !currentConfig.model) {
      form.setFieldsValue({
        config: finalConfig,
      })
      onConfigChange?.()
    }
  }, [form, onConfigChange])

  // 获取输入内容项列表
  const getInputContent = (): Array<{
    type: 'input_text' | 'input_image'
    text?: string
    image_url?: string
    image_data?: string
  }> => {
    const content = form.getFieldValue(['config', 'input_content']) || []
    return Array.isArray(content) ? content : []
  }

  // 添加输入内容项
  const addInputContent = (type: 'input_text' | 'input_image') => {
    const content = getInputContent()
    const newItem: any = { type }
    if (type === 'input_text') {
      newItem.text = ''
    } else if (type === 'input_image') {
      newItem.image_url = ''
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

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message="Gemini Agent 节点说明"
        description={
          <div>
            <p>Gemini Agent 是一个强大的 AI 代理节点，支持 Google Gemini API 的完整特性：</p>
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li><strong>多模态输入</strong>：支持文字、图片内容输入</li>
              <li><strong>系统提示词</strong>：支持系统指令和高级指令</li>
              <li><strong>数据处理</strong>：智能处理输入数据，生成结构化输出</li>
              <li><strong>缓存机制</strong>：自动缓存结果，避免重复调用</li>
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
                    tooltip="Google Gemini API Key，用于调用 Gemini API"
                  >
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="AIza..."
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
                    initialValue="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
                    rules={[{ required: true, message: '请输入 API 地址' }]}
                    tooltip="Gemini API Key 需要作为 URL 参数传递（使用 ${API_KEY} 变量）"
                  >
                    <Input placeholder="https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}" />
                  </Form.Item>

                  <Form.Item
                    name={['config', 'model']}
                    label="模型版本"
                    initialValue="gemini-pro"
                    tooltip="选择要使用的 Gemini 模型版本"
                  >
                    <Select>
                      <Option value="gemini-pro">Gemini Pro（推荐）</Option>
                      <Option value="gemini-pro-vision">Gemini Pro Vision</Option>
                      <Option value="gemini-1.5-pro">Gemini 1.5 Pro</Option>
                      <Option value="gemini-1.5-flash">Gemini 1.5 Flash</Option>
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
   - 枚举值：列出所有可能的值
   - 数值范围：最小值和最大值
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

请生成详细的 Schema 分析报告，输出格式为 JSON。`

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

                            const currentConfig = form.getFieldValue('config') || {}
                            form.setFieldsValue({
                              config: {
                                ...currentConfig,
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
                    tooltip="定义 Gemini Agent 的角色、能力和行为准则。对于 XML 结构分析，建议使用模板。"
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
                </Card>

                {/* 输入内容配置 */}
                <Card title="输入内容配置" size="small">
                  <Alert
                    message="多模态输入"
                    description="支持文字、图片内容输入。可以添加多个输入项。"
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
                          <span>{item.type === 'input_text' ? '文字' : '图片'}</span>
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
                  </Space>
                </Card>
              </Space>
            ),
          },
          {
            key: 'advanced',
            label: '高级配置',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
                    initialValue="single_item"
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
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}

export default GeminiAgentConfig

