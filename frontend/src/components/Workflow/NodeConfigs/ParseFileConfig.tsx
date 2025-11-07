/**
 * 解析文件节点配置组件
 */
import React from 'react'
import { Form, Input, Switch, Select, Button, Divider, Space, Typography } from 'antd'
import { FolderOpenOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

const { Text } = Typography

export const ParseFileConfig: React.FC<NodeConfigProps> = ({
  form,
  filePathValue,
  setFilePathValue,
  onFileSelect,
  onConfigChange,
}) => {
  const convertFormat = Form.useWatch('convert_format', form)
  const outputFormat = Form.useWatch('output_format', form)
  
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
              onConfigChange()
            }}
          />
          <Button
            type="default"
            icon={<FolderOpenOutlined />}
            onClick={() => onFileSelect('file_path')}
            style={{ width: '40px' }}
          />
        </Input.Group>
      </Form.Item>

      <Divider orientation="left">解析选项</Divider>

      <Form.Item
        name="skip_schema"
        label="跳过Schema检测"
        valuePropName="checked"
        tooltip="跳过Schema检测可以提升解析速度，但后续节点可能需要Schema信息"
      >
        <Switch onChange={onConfigChange} />
      </Form.Item>

      <Form.Item name="encoding" label="文件编码">
        <Select defaultValue="utf-8" onChange={onConfigChange}>
          <Select.Option value="utf-8">UTF-8</Select.Option>
          <Select.Option value="gbk">GBK</Select.Option>
          <Select.Option value="gb2312">GB2312</Select.Option>
        </Select>
      </Form.Item>

      <Divider orientation="left">格式转换</Divider>

      <Form.Item
        name="convert_format"
        label={
          <Space>
            <span>转换格式</span>
            <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
          </Space>
        }
        valuePropName="checked"
        tooltip="开启：将文件转换为指定格式（如XML→JSON）。关闭：只读取和识别，不转换（性能最优）"
      >
        <Switch onChange={onConfigChange} />
      </Form.Item>

      {convertFormat && (
        <Form.Item
          name="output_format"
          label="目标格式"
          tooltip="选择要转换的目标格式。选择'XML'表示保持XML格式（只读取识别）"
          rules={[{ required: true, message: '请选择目标格式' }]}
        >
          <Select placeholder="选择目标格式" onChange={onConfigChange}>
            <Select.Option value="xml">
              <Space>
                <span>XML</span>
                <Text type="secondary" style={{ fontSize: '11px' }}>保持XML格式（只读取识别）</Text>
              </Space>
            </Select.Option>
            <Select.Option value="json">
              <Space>
                <span>JSON</span>
                <Text type="secondary" style={{ fontSize: '11px' }}>结构化数据格式</Text>
              </Space>
            </Select.Option>
            <Select.Option value="table">
              <Space>
                <span>Table</span>
                <Text type="secondary" style={{ fontSize: '11px' }}>表格格式（列表字典）</Text>
              </Space>
            </Select.Option>
            <Select.Option value="schema">
              <Space>
                <span>Schema</span>
                <Text type="secondary" style={{ fontSize: '11px' }}>仅数据结构定义</Text>
              </Space>
            </Select.Option>
            <Select.Option value="yaml">YAML - YAML格式</Select.Option>
            <Select.Option value="csv">CSV - 逗号分隔值</Select.Option>
          </Select>
        </Form.Item>
      )}

      {convertFormat && outputFormat && (
        <Form.Item label="转换说明">
          <div style={{ 
            padding: '12px', 
            background: '#f0f9ff', 
            borderRadius: '4px', 
            border: '1px solid #91d5ff' 
          }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 13, color: '#1890ff' }}>
                <InfoCircleOutlined /> 当前模式: 读取文件 → 转换为 {outputFormat.toUpperCase()}
              </Text>
              {outputFormat === 'xml' && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: '4px' }}>
                  XML格式：保持原始XML格式，只进行读取和识别，不进行格式转换
                </Text>
              )}
              {outputFormat === 'table' && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: '4px' }}>
                  表格格式：将嵌套结构转换为列表字典，便于表格展示和数据处理
                </Text>
              )}
              {outputFormat === 'schema' && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: '4px' }}>
                  Schema格式：仅返回数据结构定义，不包含实际数据，用于结构分析
                </Text>
              )}
              {outputFormat === 'json' && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: '4px' }}>
                  JSON格式：保持原始数据结构，转换为标准JSON格式，便于后续处理
                </Text>
              )}
            </Space>
          </div>
        </Form.Item>
      )}

      {!convertFormat && (
        <Form.Item label="当前模式">
          <div style={{ 
            padding: '12px', 
            background: '#f6ffed', 
            borderRadius: '4px', 
            border: '1px solid #b7eb8f' 
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined /> 只读取和识别文件格式，不进行转换（性能最优，推荐用于XML文件）
            </Text>
          </div>
        </Form.Item>
      )}
    </>
  )
}

