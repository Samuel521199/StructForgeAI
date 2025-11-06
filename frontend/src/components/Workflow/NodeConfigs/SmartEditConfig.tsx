/**
 * 智能编辑节点配置组件
 */
import React from 'react'
import { Form, Input, Switch } from 'antd'
import type { NodeConfigProps } from './index'

export const SmartEditConfig: React.FC<NodeConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="instruction" 
        label="编辑指令"
        rules={[{ required: true, message: '请输入编辑指令' }]}
        tooltip="使用自然语言描述要执行的编辑操作，例如：将所有护甲的重量增加10%"
      >
        <Input.TextArea 
          rows={6} 
          placeholder="例如: 将所有Type为BodyArmor的护甲的body_armor属性增加10"
        />
      </Form.Item>
      <Form.Item 
        name="use_structure" 
        label="使用结构信息" 
        valuePropName="checked"
        tooltip="使用XML结构信息帮助AI更好地理解字段含义"
      >
        <Switch defaultChecked />
      </Form.Item>
      <Form.Item 
        name="use_editor_config" 
        label="使用编辑器配置" 
        valuePropName="checked"
        tooltip="使用编辑器配置优化编辑操作"
      >
        <Switch defaultChecked />
      </Form.Item>
    </>
  )
}

