/**
 * Memory 节点配置组件
 * 支持存储、检索、搜索、删除记忆
 */
import React from 'react'
import { Form, Input, Select, InputNumber, Switch, Alert, Space, Typography } from 'antd'
import { DatabaseOutlined, SaveOutlined, SearchOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Option } = Select
const { Text } = Typography

export const MemoryConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
}) => {
  return (
    <>
      <Alert
        message="Memory 节点说明"
        description="Memory 节点用于在工作流中存储和检索上下文信息，支持工作流记忆、会话记忆和全局记忆。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="operation"
        label="操作类型"
        rules={[{ required: true, message: '请选择操作类型' }]}
        initialValue="store"
      >
        <Select onChange={onConfigChange}>
          <Option value="store">
            <Space>
              <SaveOutlined />
              <span>存储 (Store)</span>
            </Space>
          </Option>
          <Option value="retrieve">
            <Space>
              <SearchOutlined />
              <span>检索 (Retrieve)</span>
            </Space>
          </Option>
          <Option value="search">
            <Space>
              <SearchOutlined />
              <span>搜索 (Search)</span>
            </Space>
          </Option>
          <Option value="delete">
            <Space>
              <DeleteOutlined />
              <span>删除 (Delete)</span>
            </Space>
          </Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="memory_type"
        label="记忆类型"
        rules={[{ required: true, message: '请选择记忆类型' }]}
        initialValue="workflow"
        tooltip="workflow: 工作流记忆（绑定到特定工作流）; session: 会话记忆; global: 全局记忆（跨工作流）"
      >
        <Select onChange={onConfigChange}>
          <Option value="workflow">工作流记忆 (Workflow)</Option>
          <Option value="session">会话记忆 (Session)</Option>
          <Option value="global">全局记忆 (Global)</Option>
        </Select>
      </Form.Item>

      {/* 存储操作配置 */}
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.operation !== currentValues.operation}
      >
        {({ getFieldValue }) => {
          const operation = getFieldValue('operation')
          
          if (operation === 'store') {
            return (
              <>
                <Form.Item
                  name="key"
                  label="键名 (Key)"
                  rules={[{ required: true, message: '请输入键名' }]}
                  tooltip="用于标识记忆的唯一键名"
                >
                  <Input placeholder="例如: last_analysis_result" />
                </Form.Item>

                <Form.Item
                  name="value_source"
                  label="值来源"
                  initialValue="upstream"
                  tooltip="选择值的来源：从上游节点自动提取，或手动输入"
                >
                  <Select onChange={onConfigChange}>
                    <Option value="upstream">从上游节点提取</Option>
                    <Option value="manual">手动输入</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => 
                    prevValues.value_source !== currentValues.value_source
                  }
                >
                  {({ getFieldValue }) => {
                    const valueSource = getFieldValue('value_source')
                    if (valueSource === 'manual') {
                      return (
                        <Form.Item
                          name="value"
                          label="值 (Value)"
                          rules={[{ required: true, message: '请输入值（JSON格式）' }]}
                          tooltip='JSON 格式的值，例如: {"result": "analysis"}'
                        >
                          <TextArea
                            rows={6}
                            placeholder='例如: {"result": "analysis", "timestamp": "2024-01-01T10:00:00"}'
                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                          />
                        </Form.Item>
                      )
                    }
                    return null
                  }}
                </Form.Item>

                <Form.Item
                  name="workflow_id"
                  label="工作流 ID（可选）"
                  tooltip="如果留空，将自动从当前工作流获取"
                >
                  <Input placeholder="留空则自动获取" />
                </Form.Item>

                <Form.Item
                  name="session_id"
                  label="会话 ID（可选）"
                >
                  <Input placeholder="会话标识符" />
                </Form.Item>

                <Form.Item
                  name="metadata"
                  label="元数据（可选，JSON格式）"
                  tooltip="额外的元数据信息，JSON 格式"
                >
                  <TextArea
                    rows={3}
                    placeholder='例如: {"tags": ["xml", "analysis"], "source": "ai_analysis"}'
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </Form.Item>

                <Form.Item
                  name="ttl"
                  label="过期时间（秒，可选）"
                  tooltip="设置记忆的过期时间，留空则永久保存"
                >
                  <InputNumber
                    min={1}
                    placeholder="例如: 3600（1小时）"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </>
            )
          }
          
          if (operation === 'retrieve') {
            return (
              <>
                <Form.Item
                  name="key"
                  label="键名 (Key，可选)"
                  tooltip="如果留空，将检索所有匹配条件的记忆"
                >
                  <Input placeholder="留空则检索所有" />
                </Form.Item>

                <Form.Item
                  name="workflow_id"
                  label="工作流 ID（可选）"
                >
                  <Input placeholder="过滤特定工作流" />
                </Form.Item>

                <Form.Item
                  name="session_id"
                  label="会话 ID（可选）"
                >
                  <Input placeholder="过滤特定会话" />
                </Form.Item>

                <Form.Item
                  name="limit"
                  label="返回数量限制"
                  initialValue={100}
                >
                  <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                </Form.Item>
              </>
            )
          }
          
          if (operation === 'search') {
            return (
              <>
                <Form.Item
                  name="query"
                  label="搜索关键词"
                  rules={[{ required: true, message: '请输入搜索关键词' }]}
                >
                  <Input placeholder="例如: analysis" />
                </Form.Item>

                <Form.Item
                  name="workflow_id"
                  label="工作流 ID（可选）"
                >
                  <Input placeholder="在特定工作流中搜索" />
                </Form.Item>

                <Form.Item
                  name="limit"
                  label="返回数量限制"
                  initialValue={10}
                >
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </>
            )
          }
          
          if (operation === 'delete') {
            return (
              <>
                <Form.Item
                  name="key"
                  label="键名 (Key，可选)"
                  tooltip="如果留空，将删除所有匹配条件的记忆"
                >
                  <Input placeholder="留空则删除所有匹配项" />
                </Form.Item>

                <Form.Item
                  name="workflow_id"
                  label="工作流 ID（可选）"
                >
                  <Input placeholder="删除特定工作流的记忆" />
                </Form.Item>

                <Form.Item
                  name="session_id"
                  label="会话 ID（可选）"
                >
                  <Input placeholder="删除特定会话的记忆" />
                </Form.Item>

                <Alert
                  message="警告"
                  description="删除操作不可恢复，请谨慎操作"
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </>
            )
          }
          
          return null
        }}
      </Form.Item>
    </>
  )
}

