/**
 * 生成编辑器配置节点配置组件
 */
import React from 'react'
import { Form, Input, Select } from 'antd'
import type { FormInstance } from 'antd'
import type { NodeConfigProps } from './index'

export const GenerateEditorConfigConfig: React.FC<GenerateEditorConfigConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="editor_type" 
        label="编辑器类型"
        rules={[{ required: true, message: '请选择编辑器类型' }]}
      >
        <Select placeholder="选择编辑器类型">
          <Select.Option value="form">表单编辑器</Select.Option>
          <Select.Option value="table">表格编辑器</Select.Option>
          <Select.Option value="tree">树形编辑器</Select.Option>
          <Select.Option value="custom">自定义编辑器</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item 
        name="custom_fields" 
        label="自定义字段（每行一个，可选）"
        tooltip="指定需要特别关注的字段，每行一个字段路径"
      >
        <Input.TextArea 
          rows={4} 
          placeholder="@attributes.id&#10;@attributes.name&#10;ItemComponent.Armor"
        />
      </Form.Item>
    </>
  )
}

