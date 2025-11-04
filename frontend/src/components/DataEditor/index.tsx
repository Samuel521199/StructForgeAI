import Editor from '@monaco-editor/react'
import { Card } from 'antd'

interface DataEditorProps {
  value: string
  language?: string
  onChange?: (value: string | undefined) => void
  readOnly?: boolean
  height?: string
}

const DataEditor = ({
  value,
  language = 'json',
  onChange,
  readOnly = false,
  height = '400px',
}: DataEditorProps) => {
  return (
    <Card>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
        }}
      />
    </Card>
  )
}

export default DataEditor

