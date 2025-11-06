/**
 * 解析文件节点配置组件
 */
import React from 'react'
import { Form, Input, Switch, Select, Button } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import type { NodeConfigProps } from './index'

export const ParseFileConfig: React.FC<NodeConfigProps> = ({
  form,
  filePathValue,
  setFilePathValue,
  onFileSelect,
  onConfigChange,
}) => {
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
      <Form.Item name="auto_detect" label="自动检测格式" valuePropName="checked">
        <Switch defaultChecked />
      </Form.Item>
      <Form.Item name="encoding" label="文件编码">
        <Select defaultValue="utf-8">
          <Select.Option value="utf-8">UTF-8</Select.Option>
          <Select.Option value="gbk">GBK</Select.Option>
          <Select.Option value="gb2312">GB2312</Select.Option>
        </Select>
      </Form.Item>
    </>
  )
}

