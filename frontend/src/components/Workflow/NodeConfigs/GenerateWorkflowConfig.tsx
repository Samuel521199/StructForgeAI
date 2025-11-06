/**
 * 生成工作流节点配置组件
 */
import React from 'react'
import { Form, Select } from 'antd'
import type { NodeConfigProps } from './index'

export const GenerateWorkflowConfig: React.FC<NodeConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="workflow_type" 
        label="工作流类型"
        rules={[{ required: true, message: '请选择工作流类型' }]}
      >
        <Select placeholder="选择工作流类型">
          <Select.Option value="edit">编辑工作流</Select.Option>
          <Select.Option value="validate">验证工作流</Select.Option>
          <Select.Option value="export">导出工作流</Select.Option>
          <Select.Option value="full">完整工作流</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item 
        name="target_format" 
        label="目标格式（可选）"
        tooltip="工作流输出数据的格式"
      >
        <Select placeholder="选择目标格式">
          <Select.Option value="xml">XML</Select.Option>
          <Select.Option value="json">JSON</Select.Option>
          <Select.Option value="yaml">YAML</Select.Option>
          <Select.Option value="csv">CSV</Select.Option>
        </Select>
      </Form.Item>
    </>
  )
}

