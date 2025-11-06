/**
 * Chat Model 节点配置组件
 * 支持 deepseek、chatgpt、gemini 三种模型
 */
import React, { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Card, Tabs, Typography, Space, Alert, Tooltip } from 'antd'
import { KeyOutlined, ApiOutlined, InfoCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Option } = Select
const { Text, Paragraph } = Typography

// 模型配置模板
const modelTemplates: Record<string, {
  name: string
  apiUrl: string
  defaultHeaders: string
  defaultBody: string
  description: string
}> = {
  deepseek: {
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultHeaders: JSON.stringify({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${API_KEY}'
    }, null, 2),
    defaultBody: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: '${PROMPT}' }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, null, 2),
    description: 'DeepSeek 是国产AI模型，性价比高，支持长上下文'
  },
  chatgpt: {
    name: 'ChatGPT (OpenAI)',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    defaultHeaders: JSON.stringify({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${API_KEY}'
    }, null, 2),
    defaultBody: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: '${PROMPT}' }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, null, 2),
    description: 'OpenAI 的 ChatGPT 模型，功能强大，支持多种模型版本'
  },
  gemini: {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    defaultHeaders: JSON.stringify({
      'Content-Type': 'application/json'
    }, null, 2),
    defaultBody: JSON.stringify({
      contents: [
        {
          parts: [
            { text: '${PROMPT}' }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    }, null, 2),
    description: 'Google 的 Gemini 模型，免费额度较高，性能优秀'
  }
}

export const ChatModelConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('deepseek')
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 监听模型选择变化，自动填充模板
  useEffect(() => {
    const modelType = form.getFieldValue('model_type')
    if (modelType && modelType !== selectedModel) {
      setSelectedModel(modelType)
      applyModelTemplate(modelType)
    }
  }, [form])

  // 应用模型模板
  const applyModelTemplate = (modelType: string) => {
    const template = modelTemplates[modelType]
    if (!template) return

    form.setFieldsValue({
      api_url: template.apiUrl,
      request_headers: template.defaultHeaders,
      request_body: template.defaultBody,
    })
    onConfigChange?.()
  }

  // 处理模型类型变化
  const handleModelTypeChange = (value: string) => {
    setSelectedModel(value)
    form.setFieldValue('model_type', value)
    applyModelTemplate(value)
    onConfigChange?.()
  }

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

  const currentTemplate = modelTemplates[selectedModel]

  return (
    <>
      <Form.Item
        name="model_type"
        label="模型类型"
        rules={[{ required: true, message: '请选择模型类型' }]}
        initialValue="deepseek"
      >
        <Select
          placeholder="选择 AI 模型"
          onChange={handleModelTypeChange}
          style={{ width: '100%' }}
        >
          <Option value="deepseek">
            <Space>
              <span>DeepSeek</span>
              <Text type="secondary" style={{ fontSize: 12 }}>高性价比</Text>
            </Space>
          </Option>
          <Option value="chatgpt">
            <Space>
              <span>ChatGPT (OpenAI)</span>
              <Text type="secondary" style={{ fontSize: 12 }}>功能强大</Text>
            </Space>
          </Option>
          <Option value="gemini">
            <Space>
              <span>Google Gemini</span>
              <Text type="secondary" style={{ fontSize: 12 }}>免费额度高</Text>
            </Space>
          </Option>
        </Select>
      </Form.Item>

      {currentTemplate && (
        <Alert
          message={currentTemplate.name}
          description={currentTemplate.description}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

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
                    placeholder="输入 API Key"
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
                    placeholder="例如: https://api.deepseek.com/v1/chat/completions"
                    addonAfter={
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          if (currentTemplate) {
                            form.setFieldValue('api_url', currentTemplate.apiUrl)
                            onConfigChange?.()
                          }
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
                  tooltip="请求头 JSON 格式，支持 ${API_KEY} 变量自动替换"
                >
                  <TextArea
                    rows={6}
                    placeholder='例如: {\n  "Content-Type": "application/json",\n  "Authorization": "Bearer ${API_KEY}"\n}'
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
                  tooltip="请求体 JSON 格式，支持 ${PROMPT} 变量自动替换为实际提示词"
                >
                  <TextArea
                    rows={10}
                    placeholder='例如: {\n  "model": "deepseek-chat",\n  "messages": [\n    { "role": "user", "content": "${PROMPT}" }\n  ],\n  "temperature": 0.7\n}'
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="prompt"
                  label="提示词（可选）"
                  tooltip="如果不填写，将从上游节点数据中自动提取；如果填写，将使用此提示词"
                >
                  <TextArea
                    rows={4}
                    placeholder="例如: 请分析以下XML数据结构...（留空则自动从上游节点提取）"
                  />
                </Form.Item>

                <Form.Item
                  name="timeout"
                  label="请求超时（秒）"
                  initialValue={60}
                >
                  <Input type="number" min={10} max={300} placeholder="60" />
                </Form.Item>

                <Form.Item
                  name="max_retries"
                  label="最大重试次数"
                  initialValue={3}
                >
                  <Input type="number" min={0} max={10} placeholder="3" />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'template',
            label: '模板说明',
            children: (
              <Card size="small">
                <Paragraph>
                  <Text strong>变量替换说明：</Text>
                </Paragraph>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>
                    <Text code>$&#123;API_KEY&#125;</Text>：自动替换为配置的 API Key
                  </li>
                  <li>
                    <Text code>$&#123;PROMPT&#125;</Text>：自动替换为实际提示词内容
                  </li>
                  <li>
                    <Text code>$&#123;MODEL&#125;</Text>：自动替换为选择的模型名称
                  </li>
                </ul>

                <Paragraph style={{ marginTop: 16 }}>
                  <Text strong>使用示例：</Text>
                </Paragraph>
                <TextArea
                  readOnly
                  value={JSON.stringify({
                    model: '${MODEL}',
                    messages: [
                      { role: 'user', content: '${PROMPT}' }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                  }, null, 2)}
                  rows={8}
                  style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 8 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </>
  )
}

