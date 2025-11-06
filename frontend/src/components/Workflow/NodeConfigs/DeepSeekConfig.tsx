/**
 * DeepSeek 节点配置组件
 */
import React, { useState } from 'react'
import { Form, Input, Select, Button, Tabs, Typography, Space, Alert, Tooltip } from 'antd'
import { KeyOutlined, ApiOutlined, InfoCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Text } = Typography

export const DeepSeekConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
}) => {
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 设置默认值
  React.useEffect(() => {
    if (!form.getFieldValue('api_url')) {
      form.setFieldsValue({
        api_url: 'https://api.deepseek.com/v1/chat/completions',
        request_headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${API_KEY}'
        }, null, 2),
        request_body: JSON.stringify({
          model: 'deepseek-chat',
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
        message="DeepSeek"
        description="DeepSeek 是国产AI模型，性价比高，支持长上下文，适合中文场景"
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
                    placeholder="输入 DeepSeek API Key"
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
                  initialValue="deepseek-chat"
                  tooltip="选择要使用的 DeepSeek 模型版本"
                >
                  <Select onChange={onConfigChange}>
                    <Select.Option value="deepseek-chat">DeepSeek Chat（推荐）</Select.Option>
                    <Select.Option value="deepseek-coder">DeepSeek Coder（代码专用）</Select.Option>
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
                    placeholder="https://api.deepseek.com/v1/chat/completions"
                    addonAfter={
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          form.setFieldValue('api_url', 'https://api.deepseek.com/v1/chat/completions')
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
                    placeholder="例如: 请分析以下数据...（留空则自动从上游节点提取）"
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
        ]}
      />
    </>
  )
}

