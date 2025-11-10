/**
 * 导出文件节点配置组件
 */
import React from 'react'
import { Form, Input, Select, Switch, Card, Space, Alert } from 'antd'
import { ExportOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { Option } = Select

export const ExportFileConfig: React.FC<NodeConfigProps> = ({
  form,
  onConfigChange,
  onFileSelect,
}) => {
  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message="导出文件节点说明"
        description="将处理后的数据导出为文件（XML、JSON、YAML、CSV等格式）。需要连接上游节点提供数据。"
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 输出配置 */}
        <Card title={<Space><ExportOutlined /><span>输出配置</span></Space>} size="small">
          <Form.Item
            name={['config', 'output_format']}
            label="输出格式"
            initialValue="xml"
            tooltip="选择导出文件的格式"
          >
            <Select onChange={onConfigChange}>
              <Option value="xml">XML 格式</Option>
              <Option value="json">JSON 格式</Option>
              <Option value="yaml">YAML 格式</Option>
              <Option value="csv">CSV 格式</Option>
              <Option value="excel">Excel 格式</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name={['config', 'output_path']}
            label="输出路径（可选）"
            tooltip="指定导出文件的保存路径，留空则使用默认文件名"
          >
            <Input
              placeholder="例如: F:\xml\SkiOL_arm_armors_edited.xml"
              suffix={
                onFileSelect ? (
                  <FileTextOutlined
                    onClick={() => onFileSelect('output_path')}
                    style={{ cursor: 'pointer', color: '#1890ff' }}
                  />
                ) : null
              }
              onChange={onConfigChange}
            />
          </Form.Item>

          <Form.Item
            name={['config', 'pretty_print']}
            label="格式化输出"
            valuePropName="checked"
            initialValue={true}
            tooltip="XML/JSON/YAML格式时，美化输出（格式化、缩进）"
          >
            <Switch onChange={onConfigChange} />
          </Form.Item>

          <Form.Item
            name={['config', 'sort_by']}
            label="排序字段（可选）"
            tooltip="XML格式支持：按字段排序，例如 @attributes.id 表示按id属性排序"
          >
            <Input
              placeholder="例如: @attributes.id（仅XML格式支持）"
              onChange={onConfigChange}
            />
          </Form.Item>
        </Card>
      </Space>
    </div>
  )
}

