# OpenAI ChatGPT API 传输方式说明

## 一、API 基本信息

### 1.1 端点地址
```
POST https://api.openai.com/v1/chat/completions
```

### 1.2 认证方式
使用 **Bearer Token** 认证，API Key 通过 HTTP 请求头传递：
```
Authorization: Bearer sk-...
```

## 二、请求格式

### 2.1 请求头 (Headers)

```http
Content-Type: application/json
Authorization: Bearer sk-your-api-key-here
OpenAI-Organization: org-your-org-id (可选，用于组织账户)
```

### 2.2 请求体 (Request Body)

标准 JSON 格式：

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}
```

#### 2.2.1 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型名称，如 `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo-preview` |
| `messages` | array | 消息数组，每个消息包含 `role` 和 `content` |

#### 2.2.2 消息格式

每个消息对象包含：
- `role`: 角色，可选值：
  - `system`: 系统消息（设置 AI 行为）
  - `user`: 用户消息
  - `assistant`: AI 助手回复
- `content`: 消息内容（字符串）

#### 2.2.3 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `temperature` | number | 1.0 | 控制随机性（0-2），值越高越随机 |
| `max_tokens` | integer | 无限 | 最大生成 token 数 |
| `top_p` | number | 1.0 | 核采样（0-1），与 temperature 二选一 |
| `frequency_penalty` | number | 0.0 | 频率惩罚（-2.0 到 2.0） |
| `presence_penalty` | number | 0.0 | 存在惩罚（-2.0 到 2.0） |
| `stream` | boolean | false | 是否流式返回 |
| `stop` | string/array | null | 停止序列 |
| `n` | integer | 1 | 生成多少个回复 |
| `logprobs` | boolean | false | 是否返回 token 对数概率 |
| `echo` | boolean | false | 是否回显提示词 |

## 三、响应格式

### 3.1 成功响应

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-3.5-turbo-0125",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  },
  "system_fingerprint": "fp_44709d6fcb"
}
```

### 3.2 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 请求 ID |
| `object` | string | 对象类型，通常是 `chat.completion` |
| `created` | integer | 创建时间戳 |
| `model` | string | 使用的模型名称 |
| `choices` | array | 回复列表，通常只有一个元素 |
| `choices[].message` | object | 回复消息对象 |
| `choices[].message.content` | string | **这是我们要提取的主要内容** |
| `choices[].finish_reason` | string | 结束原因（`stop`, `length`, `content_filter`） |
| `usage` | object | Token 使用统计 |
| `usage.prompt_tokens` | integer | 提示词 token 数 |
| `usage.completion_tokens` | integer | 回复 token 数 |
| `usage.total_tokens` | integer | 总 token 数 |

### 3.3 错误响应

```json
{
  "error": {
    "message": "Incorrect API key provided",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

## 四、完整示例

### 4.1 Python 示例（使用 requests）

```python
import requests

url = "https://api.openai.com/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk-your-api-key-here"
}
data = {
    "model": "gpt-3.5-turbo",
    "messages": [
        {"role": "user", "content": "Hello, how are you?"}
    ],
    "temperature": 0.7,
    "max_tokens": 2000
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

# 提取回复内容
content = result["choices"][0]["message"]["content"]
print(content)
```

### 4.2 使用系统消息

```python
data = {
    "model": "gpt-3.5-turbo",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful assistant that translates English to French."
        },
        {
            "role": "user",
            "content": "Translate the following English text to French: Hello, world!"
        }
    ]
}
```

### 4.3 多轮对话

```python
data = {
    "model": "gpt-3.5-turbo",
    "messages": [
        {"role": "user", "content": "What is 2+2?"},
        {"role": "assistant", "content": "2+2 equals 4."},
        {"role": "user", "content": "What is 4+4?"}
    ]
}
```

## 五、在 StructForge AI 中的使用

### 5.1 配置示例

在 ChatGPT 节点中，默认配置如下：

**请求头 (request_headers)**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer ${API_KEY}"
}
```

**请求体 (request_body)**:
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "${PROMPT}"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 5.2 变量替换

- `${API_KEY}`: 自动替换为配置的 API Key
- `${PROMPT}`: 自动替换为实际提示词内容
- `${MODEL}`: 自动替换为选择的模型名称

### 5.3 支持的模型

- `gpt-3.5-turbo` - GPT-3.5 Turbo（推荐，性价比高）
- `gpt-4` - GPT-4（功能强大）
- `gpt-4-turbo-preview` - GPT-4 Turbo（最新预览版）
- `gpt-4o` - GPT-4o（多模态优化）
- `gpt-4o-mini` - GPT-4o Mini（轻量版）

## 六、最佳实践

### 6.1 错误处理

```python
try:
    response = requests.post(url, headers=headers, json=data, timeout=60)
    response.raise_for_status()
    result = response.json()
except requests.exceptions.HTTPError as e:
    if response.status_code == 401:
        print("API Key 无效")
    elif response.status_code == 429:
        print("请求频率过高，请稍后重试")
    else:
        print(f"HTTP 错误: {e}")
except requests.exceptions.Timeout:
    print("请求超时")
except Exception as e:
    print(f"其他错误: {e}")
```

### 6.2 参数调优

- **temperature**: 
  - 0.0-0.3: 保守、确定性回答
  - 0.7-1.0: 平衡创造性和准确性（推荐）
  - 1.5-2.0: 非常创造性，但可能不准确

- **max_tokens**: 
  - 短回复：100-500
  - 中等回复：500-2000
  - 长回复：2000-4000（注意成本）

### 6.3 成本优化

- 使用 `gpt-3.5-turbo` 而不是 `gpt-4`（便宜 10 倍）
- 设置合理的 `max_tokens` 限制
- 使用 `stream: true` 可以更快获得首字回复
- 缓存常用请求结果

## 七、常见问题

### 7.1 API Key 获取

1. 访问 https://platform.openai.com/api-keys
2. 登录 OpenAI 账户
3. 点击 "Create new secret key"
4. 复制并安全保存 API Key（格式：`sk-...`）

### 7.2 网络问题

如果在中国大陆访问，可能需要：
- 使用代理服务器
- 配置 VPN
- 使用中转服务

### 7.3 速率限制

- 免费账户：3 RPM (requests per minute)
- 付费账户：根据套餐不同，通常 60-500 RPM
- 如果遇到 429 错误，需要等待或升级账户

## 八、参考资源

- 官方文档：https://platform.openai.com/docs/api-reference/chat
- API 参考：https://platform.openai.com/docs/api-reference/chat/create
- 模型列表：https://platform.openai.com/docs/models
- 定价信息：https://openai.com/pricing

