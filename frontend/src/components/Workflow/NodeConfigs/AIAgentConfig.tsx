/**
 * AI Agent 节点配置组件
 * 提供专门的UI来配置AI Agent的特性：系统提示词、目标设定、记忆策略、工具选择等
 */
import React from 'react'
import { Form, Input, Select, Switch, Card, Divider, Alert, Space, Typography } from 'antd'
import { InfoCircleOutlined, BulbOutlined, DatabaseOutlined, ToolOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { TextArea } = Input
const { Option } = Select
const { Text, Title } = Typography

const AIAgentConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
  nodes = [],
  edges = [],
  nodeId,
}) => {
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
      chatgpt: 'ChatGPT',
      gemini: 'Gemini',
      deepseek: 'DeepSeek',
      chat_model: 'Chat Model',
      memory: 'Memory',
    }
    return typeNames[type] || type
  }
  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message="AI Agent 节点说明"
        description={
          <div>
            <p>AI Agent 是一个智能代理节点，负责：</p>
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li><strong>思考与决策</strong>：通过连接的大模型进行智能分析和决策</li>
              <li><strong>记忆管理</strong>：可选择连接 Memory 节点存储和检索上下文信息</li>
              <li><strong>工具扩展</strong>：可连接 Tool 节点扩展功能</li>
              <li><strong>数据处理</strong>：处理输入数据，生成结构化输出</li>
            </ul>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              <strong>必需连接：</strong>Chat Model 节点（ChatGPT/Gemini/DeepSeek）
            </p>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 系统提示词配置 */}
        <Card
          title={
            <Space>
              <BulbOutlined />
              <span>系统提示词与角色设定</span>
            </Space>
          }
          size="small"
        >
          <Form.Item
            name={['config', 'system_prompt']}
            label="系统提示词"
            tooltip="定义AI Agent的角色、能力和行为准则。这将作为每次对话的系统消息发送给大模型。"
            rules={[
              { required: true, message: '请输入系统提示词' },
              { min: 10, message: '系统提示词至少需要10个字符' },
            ]}
          >
            <TextArea
              rows={6}
              placeholder="例如：你是一个专业的数据分析助手，擅长分析XML文件结构和提取关键信息。请根据用户输入的数据，提供准确、结构化的分析结果。"
              onChange={onConfigChange}
            />
          </Form.Item>

          <Form.Item
            name={['config', 'temperature']}
            label="温度参数 (Temperature)"
            tooltip="控制模型输出的随机性。较低的值（0.1-0.3）使输出更确定，较高的值（0.7-1.0）使输出更随机。"
            initialValue={0.7}
          >
            <Select onChange={onConfigChange}>
              <Option value={0.1}>0.1 - 非常确定</Option>
              <Option value={0.3}>0.3 - 较确定</Option>
              <Option value={0.5}>0.5 - 平衡</Option>
              <Option value={0.7}>0.7 - 较随机</Option>
              <Option value={0.9}>0.9 - 非常随机</Option>
              <Option value={1.0}>1.0 - 最大随机</Option>
            </Select>
          </Form.Item>
        </Card>

        {/* 目标设定 */}
        <Card
          title={
            <Space>
              <BulbOutlined />
              <span>目标与任务设定</span>
            </Space>
          }
          size="small"
        >
          <Form.Item
            name={['config', 'goal']}
            label="任务目标"
            tooltip="明确AI Agent需要完成的具体任务目标。这将帮助AI Agent更好地理解用户意图。"
          >
            <TextArea
              rows={3}
              placeholder="例如：分析XML文件结构，提取关键字段，生成数据摘要报告。"
              onChange={onConfigChange}
            />
          </Form.Item>

          <Form.Item
            name={['config', 'output_format']}
            label="输出格式"
            tooltip="指定AI Agent输出的数据格式。"
            initialValue="json"
          >
            <Select onChange={onConfigChange}>
              <Option value="json">JSON 格式</Option>
              <Option value="text">文本格式</Option>
              <Option value="structured">结构化数据</Option>
              <Option value="markdown">Markdown 格式</Option>
            </Select>
          </Form.Item>
        </Card>

        {/* 记忆策略配置 */}
        <Card
          title={
            <Space>
              <DatabaseOutlined />
              <span>记忆策略</span>
            </Space>
          }
          size="small"
        >
          <Form.Item
            name={['config', 'use_memory']}
            label="启用记忆功能"
            tooltip="如果连接了 Memory 节点，启用此选项可以存储和检索对话历史、上下文信息等。"
            valuePropName="checked"
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
                    name={['config', 'memory_strategy']}
                    label="记忆策略"
                    tooltip="选择如何使用记忆：自动存储所有对话、只存储关键信息、或手动控制。"
                    initialValue="auto"
                  >
                    <Select onChange={onConfigChange}>
                      <Option value="auto">自动存储 - 存储所有输入和输出</Option>
                      <Option value="key_only">关键信息 - 只存储重要信息</Option>
                      <Option value="manual">手动控制 - 通过代码控制存储</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name={['config', 'memory_type']}
                    label="记忆类型"
                    tooltip="选择记忆存储的类型：工作流级（仅在当前工作流有效）、会话级（跨工作流但临时）、全局级（永久存储）。"
                    initialValue="workflow"
                  >
                    <Select onChange={onConfigChange}>
                      <Option value="workflow">工作流级 - 仅当前工作流</Option>
                      <Option value="session">会话级 - 跨工作流临时</Option>
                      <Option value="global">全局级 - 永久存储</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name={['config', 'memory_ttl']}
                    label="记忆过期时间 (秒)"
                    tooltip="设置记忆的过期时间，0表示永不过期。"
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
        </Card>

        {/* 工具配置 */}
        <Card
          title={
            <Space>
              <ToolOutlined />
              <span>工具与扩展</span>
            </Space>
          }
          size="small"
        >
          <Alert
            message="工具功能"
            description="如果连接了 Tool 节点，可以扩展AI Agent的功能。工具配置将在连接Tool节点后自动识别。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name={['config', 'tool_enabled']}
            label="启用工具"
            tooltip="启用后，AI Agent可以使用连接的Tool节点提供的功能。"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch onChange={onConfigChange} />
          </Form.Item>
        </Card>

        {/* 数据处理选项 */}
        <Card
          title="数据处理选项"
          size="small"
        >
          <Alert
            message="数据量控制"
            description="当XML数据较大时，可以选择部分数据发送给大模型，避免超过Token限制。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item
            name={['config', 'data_processing_mode']}
            label="数据处理模式"
            tooltip="选择如何处理输入数据，避免超过Token限制"
            initialValue="smart"
          >
            <Select onChange={onConfigChange}>
              <Option value="direct">直接传递 - 原样传递给大模型（可能超过Token限制）</Option>
              <Option value="smart">智能采样 - 自动选择代表性数据（推荐）</Option>
              <Option value="limit">限制数量 - 只传递前N条记录</Option>
              <Option value="summary">摘要模式 - 生成数据摘要后传递</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.config?.data_processing_mode !== currentValues.config?.data_processing_mode
            }
          >
            {({ getFieldValue }) => {
              const mode = getFieldValue(['config', 'data_processing_mode'])
              if (mode === 'limit') {
                return (
                  <Form.Item
                    name={['config', 'data_limit_count']}
                    label="数据条数限制"
                    tooltip="只传递前N条记录给大模型"
                    rules={[{ type: 'number', min: 1, max: 1000 }]}
                    initialValue={10}
                  >
                    <Input type="number" min={1} max={1000} onChange={onConfigChange} />
                  </Form.Item>
                )
              }
              if (mode === 'smart') {
                return (
                  <>
                    <Form.Item
                      name={['config', 'max_data_tokens']}
                      label="数据Token限制"
                      tooltip="限制输入数据的最大Token数量（建议：2000-8000）"
                      rules={[{ type: 'number', min: 500, max: 50000 }]}
                      initialValue={4000}
                    >
                      <Input type="number" min={500} max={50000} onChange={onConfigChange} />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'sample_strategy']}
                      label="采样策略"
                      tooltip="智能采样时使用的策略。对于XML格式，推荐使用'多样化采样'以确保覆盖不同类型的子节点内容。"
                      initialValue="diverse"
                    >
                      <Select onChange={onConfigChange}>
                        <Option value="diverse">多样化采样 - 确保覆盖不同类型的子节点（推荐，XML格式自动使用）</Option>
                        <Option value="head_tail">首尾采样 - 保留开头和结尾的数据</Option>
                        <Option value="uniform">均匀采样 - 均匀分布采样</Option>
                        <Option value="head">仅开头 - 只保留开头的数据</Option>
                        <Option value="random">随机采样 - 随机选择数据</Option>
                      </Select>
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
          </Form.Item>

          <Form.Item
            name={['config', 'max_tokens']}
            label="最大输出长度 (Tokens)"
            tooltip="限制AI Agent输出的最大长度，防止输出过长。"
            initialValue={2000}
          >
            <Input
              type="number"
              min={100}
              max={8000}
              placeholder="建议值：1000-4000"
              onChange={onConfigChange}
            />
          </Form.Item>
        </Card>

        {/* 连接状态显示 */}
        <Card
          title="连接状态"
          size="small"
        >
          <Form.Item
            name={['config', 'chat_model_connected']}
            label="Chat Model 连接"
            tooltip="是否已连接大模型节点（必需）。请从AI Agent节点底部的Chat Model端口连接ChatGPT、Gemini或DeepSeek节点。"
          >
            <Select disabled>
              <Option value={true}>✓ 已连接</Option>
              <Option value={false}>✗ 未连接（必需）</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.config?.chat_model_connected !== currentValues.config?.chat_model_connected ||
              prevValues.config?.chat_model_node?.id !== currentValues.config?.chat_model_node?.id
            }
          >
            {({ getFieldValue }) => {
              const chatModelConnected = getFieldValue(['config', 'chat_model_connected'])
              const chatModelNode = getFieldValue(['config', 'chat_model_node']) || getConnectedNodeInfo('chat_model')
              
              if (!chatModelConnected || !chatModelNode) {
                return (
                  <Alert
                    message="未连接 Chat Model"
                    description="请从AI Agent节点底部的Chat Model端口（🤖）连接ChatGPT、Gemini或DeepSeek节点。"
                    type="warning"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                )
              }
              
              const nodeTypeName = getNodeTypeName(chatModelNode.type)
              const nodeLabel = chatModelNode.label || chatModelNode.id
              
              return (
                <Alert
                  message="Chat Model 已连接"
                  description={
                    <div>
                      <div>已连接到：<strong>{nodeTypeName}</strong> ({nodeLabel})</div>
                      <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                        请确保在连接的节点中配置了API Key和API URL。
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
          
          <Alert
            message="连接说明"
            description="AI Agent需要通过连接Chat Model节点来获取API配置。请从AI Agent节点底部的Chat Model端口（🤖）连接ChatGPT、Gemini或DeepSeek节点，并在连接的节点中配置API Key和API URL。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />

          <Form.Item
            name={['config', 'memory_connected']}
            label="Memory 连接"
            tooltip="是否已连接记忆节点（可选）"
          >
            <Select disabled>
              <Option value={true}>✓ 已连接</Option>
              <Option value={false}>✗ 未连接</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name={['config', 'tool_connected']}
            label="Tool 连接"
            tooltip="是否已连接工具节点（可选）"
          >
            <Select disabled>
              <Option value={true}>✓ 已连接</Option>
              <Option value={false}>✗ 未连接</Option>
            </Select>
          </Form.Item>
        </Card>
      </Space>
    </div>
  )
}

export default AIAgentConfig

