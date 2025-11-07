/**
 * ChatGPT 节点配置组件
 * 基于 OpenAI Responses API 设计
 * 参考: https://platform.openai.com/docs/guides/text
 */
import React, { useState } from 'react'
import { Form, Input, Select, Button, Tabs, Typography, Space, Alert, Tooltip, Switch, Divider, Radio } from 'antd'
import { KeyOutlined, ApiOutlined, InfoCircleOutlined, EyeInvisibleOutlined, EyeOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Text } = Typography

export const ChatGPTConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
}) => {
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [inputMode, setInputMode] = useState<'simple' | 'messages'>('simple')

  // 设置默认值（使用新的 Responses API）
  React.useEffect(() => {
    if (!form.getFieldValue('api_url')) {
      form.setFieldsValue({
        api_url: 'https://api.openai.com/v1/responses',
        model: 'gpt-5-nano',
        input_mode: 'simple',
        input: '${PROMPT}',
        request_headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${API_KEY}'
        }, null, 2),
        request_body: JSON.stringify({
          model: 'gpt-5-nano',
          input: '${PROMPT}',
          temperature: 0.7
        }, null, 2),
      })
      onConfigChange?.()
    }
  }, [])

  // 验证 JSON 格式
  const validateJSON = (value: string): boolean => {
    if (!value) return true
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }

  // 获取消息列表
  const getMessages = (): Array<{ role: string; content: string }> => {
    const messages = form.getFieldValue('messages') || []
    return Array.isArray(messages) ? messages : []
  }

  // 添加消息
  const addMessage = () => {
    const messages = getMessages()
    messages.push({ role: 'user', content: '' })
    form.setFieldValue('messages', messages)
    onConfigChange?.()
  }

  // 删除消息
  const removeMessage = (index: number) => {
    const messages = getMessages()
    messages.splice(index, 1)
    form.setFieldValue('messages', messages)
    onConfigChange?.()
  }

  // 更新消息
  const updateMessage = (index: number, field: 'role' | 'content', value: string) => {
    const messages = getMessages()
    messages[index] = { ...messages[index], [field]: value }
    form.setFieldValue('messages', messages)
    onConfigChange?.()
  }

  // 输入模式改变时更新请求体
  const handleInputModeChange = (mode: 'simple' | 'messages') => {
    setInputMode(mode)
    form.setFieldValue('input_mode', mode)
    
    // 更新请求体模板
    const currentBody = form.getFieldValue('request_body')
    let bodyObj: any = {}
    try {
      bodyObj = currentBody ? JSON.parse(currentBody) : {}
    } catch {
      bodyObj = {}
    }

    if (mode === 'simple') {
      bodyObj.input = '${PROMPT}'
      delete bodyObj.messages
    } else {
      bodyObj.input = [
        { role: 'developer', content: '${INSTRUCTIONS}' },
        { role: 'user', content: '${PROMPT}' }
      ]
    }

    form.setFieldValue('request_body', JSON.stringify(bodyObj, null, 2))
    onConfigChange?.()
  }

  return (
    <>
      <Alert
        message="ChatGPT (OpenAI Responses API)"
        description={
          <div>
            <div>使用 OpenAI 最新的 Responses API，支持 Text Generation、Structured Outputs 等功能</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              API 端点: POST https://api.openai.com/v1/responses
            </div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              推荐模型: gpt-5-nano, gpt-5, gpt-4o, gpt-4o-mini
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#ff4d4f' }}>
              注意: Responses API 是新的推荐 API，功能更强大，支持 Reasoning Models
            </div>
          </div>
        }
        type="info"
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
              <>
                <Form.Item
                  name="api_key"
                  label={
                    <Space>
                      <KeyOutlined />
                      <span>API Key</span>
                      <Tooltip title="API Key 将安全存储，不会在工作流中明文显示">
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: '请输入 API Key' }]}
                >
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    suffix={
                      <Button
                        type="text"
                        icon={showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{ border: 'none' }}
                      />
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="model"
                  label="模型版本"
                  initialValue="gpt-5-nano"
                  tooltip={
                    <div>
                      <div>推荐使用 Reasoning Models（推理模型）以获得更好的效果：</div>
                      <div>- gpt-5-nano: 快速响应，适合简单任务</div>
                      <div>- gpt-5: 高性能，适合复杂任务</div>
                      <div>- gpt-4o: 平衡性能和成本</div>
                      <div>- gpt-4o-mini: 轻量级，低成本</div>
                    </div>
                  }
                >
                  <Select onChange={onConfigChange}>
                    <Select.Option value="gpt-5-nano">GPT-5 Nano（推荐，快速）</Select.Option>
                    <Select.Option value="gpt-5">GPT-5（推荐，高性能）</Select.Option>
                    <Select.Option value="gpt-4o">GPT-4o</Select.Option>
                    <Select.Option value="gpt-4o-mini">GPT-4o Mini</Select.Option>
                    <Select.Option value="gpt-4-turbo">GPT-4 Turbo</Select.Option>
                    <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="api_url"
                  label={
                    <Space>
                      <ApiOutlined />
                      <span>API 地址</span>
                    </Space>
                  }
                  rules={[
                    { required: true, message: '请输入 API 地址' },
                    { type: 'url', message: '请输入有效的 URL 地址' }
                  ]}
                >
                  <Input
                    placeholder="https://api.openai.com/v1/responses"
                    addonAfter={
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          form.setFieldValue('api_url', 'https://api.openai.com/v1/responses')
                          onConfigChange?.()
                        }}
                      >
                        使用默认
                      </Button>
                    }
                  />
                </Form.Item>

                <Divider orientation="left">输入配置</Divider>

                <Form.Item
                  name="input_mode"
                  label="输入模式"
                  initialValue="simple"
                  tooltip={
                    <div>
                      <div>简单模式：直接输入文本字符串</div>
                      <div>消息模式：使用消息数组，支持 developer/user/assistant 角色</div>
                    </div>
                  }
                >
                  <Radio.Group
                    value={inputMode}
                    onChange={(e) => handleInputModeChange(e.target.value)}
                  >
                    <Radio value="simple">简单文本</Radio>
                    <Radio value="messages">消息数组</Radio>
                  </Radio.Group>
                </Form.Item>

                {inputMode === 'simple' ? (
                  <Form.Item
                    name="input"
                    label="输入文本"
                    tooltip='直接输入文本，支持 ${PROMPT} 变量替换。如果留空，将从上游节点自动提取'
                  >
                    <TextArea
                      rows={4}
                      placeholder={`例如: \${PROMPT} 或直接输入文本`}
                      onChange={onConfigChange}
                    />
                  </Form.Item>
                ) : (
                  <>
                    <Form.Item label="消息列表">
                      {getMessages().map((msg: any, index: number) => (
                        <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Space>
                              <Select
                                value={msg.role}
                                onChange={(value) => updateMessage(index, 'role', value)}
                                style={{ width: 120 }}
                              >
                                <Select.Option value="developer">Developer（系统规则）</Select.Option>
                                <Select.Option value="user">User（用户输入）</Select.Option>
                                <Select.Option value="assistant">Assistant（助手回复）</Select.Option>
                              </Select>
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeMessage(index)}
                              >
                                删除
                              </Button>
                            </Space>
                            <TextArea
                              value={msg.content}
                              onChange={(e) => updateMessage(index, 'content', e.target.value)}
                              placeholder={msg.role === 'developer' ? '例如: Talk like a pirate.' : `例如: \${PROMPT}`}
                              rows={3}
                            />
                          </Space>
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={addMessage}
                        block
                      >
                        添加消息
                      </Button>
                    </Form.Item>
                  </>
                )}

                <Form.Item
                  name="instructions"
                  label="Instructions（高级指令）"
                  tooltip={
                    <div>
                      <div>提供高级指令，定义模型的角色、语气、目标和示例</div>
                      <div>Instructions 优先级高于 input 中的 prompt</div>
                      <div>例如: "Talk like a pirate." 或 "You are a helpful assistant specialized in data analysis."</div>
                    </div>
                  }
                >
                  <TextArea
                    rows={3}
                    placeholder="例如: Talk like a pirate. 或 You are a professional data analyst..."
                    onChange={onConfigChange}
                  />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'advanced',
            label: '高级配置',
            children: (
              <>
                <Divider orientation="left">推理配置（Reasoning Models）</Divider>

                <Form.Item
                  name="reasoning_enabled"
                  label="启用推理模式"
                  valuePropName="checked"
                  tooltip="仅适用于 Reasoning Models（如 gpt-5, o3），提供更智能的推理能力"
                >
                  <Switch onChange={onConfigChange} />
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) =>
                    prevValues.reasoning_enabled !== currentValues.reasoning_enabled
                  }
                >
                  {({ getFieldValue }) =>
                    getFieldValue('reasoning_enabled') ? (
                      <Form.Item
                        name="reasoning_effort"
                        label="推理努力程度"
                        tooltip="控制推理的深度：low（快速），medium（平衡），high（深度推理）"
                      >
                        <Select defaultValue="low" onChange={onConfigChange}>
                          <Select.Option value="low">Low（快速）</Select.Option>
                          <Select.Option value="medium">Medium（平衡）</Select.Option>
                          <Select.Option value="high">High（深度推理）</Select.Option>
                        </Select>
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>

                <Divider orientation="left">提示词模板（Prompt Templates）</Divider>

                <Form.Item
                  name="prompt_id"
                  label="Prompt ID"
                  tooltip="使用 OpenAI Dashboard 创建的可重用提示词模板 ID"
                >
                  <Input placeholder="pmpt_abc123" onChange={onConfigChange} />
                </Form.Item>

                <Form.Item
                  name="prompt_version"
                  label="Prompt Version"
                  tooltip="提示词模板的版本号（留空使用当前版本）"
                >
                  <Input placeholder="2" onChange={onConfigChange} />
                </Form.Item>

                <Form.Item
                  name="prompt_variables"
                  label="Prompt 变量（JSON）"
                  tooltip='替换提示词模板中的变量，例如: {"customer_name": "Jane Doe", "product": "40oz juice box"}'
                >
                  <TextArea
                    rows={4}
                    placeholder='例如: {"customer_name": "Jane Doe", "product": "40oz juice box"}'
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                    onChange={onConfigChange}
                  />
                </Form.Item>

                <Divider orientation="left">参数配置</Divider>

                <Form.Item
                  name="temperature"
                  label="Temperature"
                  tooltip="控制回复的随机性：0.0-0.3（保守），0.7-1.0（平衡，推荐），1.5-2.0（创造性）"
                >
                  <Input type="number" min={0} max={2} step={0.1} defaultValue={0.7} onChange={onConfigChange} />
                </Form.Item>

                <Form.Item
                  name="max_tokens"
                  label="Max Tokens"
                  tooltip="限制生成响应的最大 Token 数量"
                >
                  <Input type="number" min={1} defaultValue={2000} onChange={onConfigChange} />
                </Form.Item>

                <Divider orientation="left">请求配置</Divider>

                <Form.Item
                  name="request_headers"
                  label="请求头 (JSON)"
                  rules={[
                    { required: false },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve()
                        if (validateJSON(value)) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('请输入有效的 JSON 格式'))
                      }
                    }
                  ]}
                  tooltip={
                    <div>
                      <div>OpenAI API 标准请求头：</div>
                      <div>- Content-Type: application/json</div>
                      <div>- Authorization: Bearer ${'${API_KEY}'}（必需）</div>
                      <div>支持 ${'${API_KEY}'} 变量自动替换</div>
                    </div>
                  }
                >
                  <TextArea
                    rows={6}
                    placeholder={`例如: {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${'${API_KEY}'}"
}`}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                    onChange={onConfigChange}
                  />
                </Form.Item>

                <Form.Item
                  name="request_body"
                  label="请求体 (JSON)"
                  rules={[
                    { required: true, message: '请配置请求体' },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.reject(new Error('请配置请求体'))
                        if (validateJSON(value)) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('请输入有效的 JSON 格式'))
                      }
                    }
                  ]}
                  tooltip={
                    <div>
                      <div>Responses API 标准格式：</div>
                      <div>- model: 模型名称（必需）</div>
                      <div>- input: 输入文本或消息数组（必需）</div>
                      <div>- instructions: 高级指令（可选）</div>
                      <div>- reasoning: 推理配置（可选，仅 Reasoning Models）</div>
                      <div>- prompt: 提示词模板（可选）</div>
                      <div>支持 {'${PROMPT}'}、{'${INSTRUCTIONS}'}、{'${API_KEY}'} 变量自动替换</div>
                    </div>
                  }
                >
                  <TextArea
                    rows={12}
                    placeholder={`例如: {
  "model": "gpt-5-nano",
  "input": "${'${PROMPT}'}",
  "instructions": "${'${INSTRUCTIONS}'}",
  "temperature": 0.7
}`}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                    onChange={onConfigChange}
                  />
                </Form.Item>

                <Form.Item
                  name="timeout"
                  label="请求超时（秒）"
                  initialValue={60}
                  tooltip="OpenAI API 请求超时时间，建议 60-120 秒"
                >
                  <Input type="number" min={10} max={300} onChange={onConfigChange} />
                </Form.Item>

                <Form.Item
                  name="max_retries"
                  label="最大重试次数"
                  initialValue={3}
                  tooltip="请求失败时的自动重试次数（如遇到 429 速率限制错误）"
                >
                  <Input type="number" min={0} max={10} onChange={onConfigChange} />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </>
  )
}

