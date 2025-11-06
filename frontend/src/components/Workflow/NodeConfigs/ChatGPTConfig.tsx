/**
 * ChatGPT 节点配置组件
 */
import React, { useState } from 'react'
import { Form, Input, Select, Button, Tabs, Typography, Space, Alert, Tooltip } from 'antd'
import { KeyOutlined, ApiOutlined, InfoCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Text } = Typography

export const ChatGPTConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
}) => {
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 设置默认值
  React.useEffect(() => {
    if (!form.getFieldValue('api_url')) {
      form.setFieldsValue({
        api_url: 'https://api.openai.com/v1/chat/completions',
        request_headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${API_KEY}'
        }, null, 2),
        request_body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: '${PROMPT}' }
          ],
          temperature: 0.7,
          max_tokens: 2000
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

  return (
    <>
      <Alert
        message="ChatGPT (OpenAI)"
        description={
          <div>
            <div>OpenAI 的 ChatGPT 模型，功能强大，支持多种模型版本</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              API 端点: POST https://api.openai.com/v1/chat/completions
            </div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              认证方式: Bearer Token (Authorization 请求头)
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
                    placeholder="输入 OpenAI API Key"
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
                  initialValue="gpt-3.5-turbo"
                  tooltip="选择要使用的 OpenAI 模型版本"
                >
                  <Select onChange={onConfigChange}>
                    <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo（推荐）</Select.Option>
                    <Select.Option value="gpt-4">GPT-4</Select.Option>
                    <Select.Option value="gpt-4-turbo-preview">GPT-4 Turbo</Select.Option>
                    <Select.Option value="gpt-4o">GPT-4o</Select.Option>
                    <Select.Option value="gpt-4o-mini">GPT-4o Mini</Select.Option>
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
                    placeholder="https://api.openai.com/v1/chat/completions"
                    addonAfter={
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          form.setFieldValue('api_url', 'https://api.openai.com/v1/chat/completions')
                          onConfigChange?.()
                        }}
                      >
                        使用默认
                      </Button>
                    }
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
                      <div>OpenAI API 标准格式，必须包含：</div>
                      <div>- model: 模型名称</div>
                      <div>- messages: 消息数组（role: user/assistant/system, content: 消息内容）</div>
                      <div>支持 ${PROMPT} 变量自动替换为实际提示词</div>
                    </div>
                  }
                >
                  <TextArea
                    rows={12}
                    placeholder={`例如: {
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "user", "content": "${'${PROMPT}'}" }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}`}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </Form.Item>

                <Form.Item
                  name="prompt"
                  label="提示词（可选）"
                  tooltip="如果不填写，将从上游节点数据中自动提取；如果填写，将使用此提示词。提示词会自动替换请求体中的 ${PROMPT} 变量"
                >
                  <TextArea
                    rows={4}
                    placeholder="例如: 请分析以下数据...（留空则自动从上游节点提取）"
                  />
                </Form.Item>

                <Form.Item
                  name="temperature"
                  label="Temperature（可选）"
                  tooltip="控制回复的随机性：0.0-0.3（保守），0.7-1.0（平衡，推荐），1.5-2.0（创造性）"
                >
                  <Input type="number" min={0} max={2} step={0.1} placeholder="0.7" />
                </Form.Item>

                <Form.Item
                  name="timeout"
                  label="请求超时（秒）"
                  initialValue={60}
                  tooltip="OpenAI API 请求超时时间，建议 60-120 秒"
                >
                  <Input type="number" min={10} max={300} placeholder="60" />
                </Form.Item>

                <Form.Item
                  name="max_retries"
                  label="最大重试次数"
                  initialValue={3}
                  tooltip="请求失败时的自动重试次数（如遇到 429 速率限制错误）"
                >
                  <Input type="number" min={0} max={10} placeholder="3" />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </>
  )
}

