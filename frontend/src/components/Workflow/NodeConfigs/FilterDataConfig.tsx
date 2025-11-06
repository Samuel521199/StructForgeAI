/**
 * 过滤数据节点配置组件
 */
import React from 'react'
import { Form, Input } from 'antd'
import type { NodeConfigProps } from './index'

export const FilterDataConfig: React.FC<NodeConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="filter_condition" 
        label="过滤条件（JSON格式）"
        rules={[{ required: true, message: '请输入过滤条件' }]}
        tooltip='用于过滤数据的条件，例如：{"@attributes.Type": "BodyArmor"} 或 {"Type": "BodyArmor"}'
      >
        <Input.TextArea 
          rows={6} 
          placeholder='{"@attributes.Type": "BodyArmor"} 或 {"Type": "BodyArmor"}'
        />
      </Form.Item>
      <Form.Item 
        name="path" 
        label="数据路径（可选）"
        tooltip="如果指定，将从该路径获取数据；否则使用输入数据"
      >
        <Input placeholder="例如: Items.Item" />
      </Form.Item>
    </>
  )
}

