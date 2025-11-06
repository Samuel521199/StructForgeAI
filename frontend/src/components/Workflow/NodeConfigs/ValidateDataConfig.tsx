/**
 * 验证数据节点配置组件
 */
import React from 'react'
import { Form, Input } from 'antd'
import type { NodeConfigProps } from './index'

export const ValidateDataConfig: React.FC<NodeConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="required_fields" 
        label="必填字段（每行一个）"
        tooltip="每行一个字段路径，例如：@attributes.id 或 ItemComponent.Armor.body_armor"
      >
        <Input.TextArea 
          rows={6} 
          placeholder="@attributes.id&#10;@attributes.name&#10;ItemComponent.Armor"
        />
      </Form.Item>
      <Form.Item 
        name="schema" 
        label="Schema验证（JSON格式，可选）"
        tooltip="用于验证数据的Schema结构（JSON格式）"
      >
        <Input.TextArea 
          rows={8} 
          placeholder='{"type": "object", "properties": {...}}'
        />
      </Form.Item>
    </>
  )
}

