# GitHub Actions 使用 Wrangler CLI 配置指南

## 快速开始

### 1. 创建 Cloudflare API Token

访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 并创建新token：

**权限设置：**
- `Account:Cloudflare R2:Edit` - 允许编辑R2存储桶
- `Zone:Zone:Read` - 如果需要读取区域信息（可选）

**资源范围：**
- 账户：选择你的Cloudflare账户
- 区域：选择相关域名（可选）

### 2. 配置 GitHub Secrets

在你的GitHub仓库中添加以下secret：

```bash
# 在 GitHub 仓库设置 → Secrets and variables → Actions
名称: CLOUDFLARE_API_TOKEN
值: 你的API Token值
```

### 3. 工作流文件

文件位置：`.github/workflows/deploy.yml`

## 工作流详解

### 触发条件
- 推送到 `main` 或 `master` 分支
- 创建Pull Request
- 手动触发（workflow_dispatch）

### 环境变量
```yaml
env:
  R2_BUCKET: xiaodouli  # 你的R2存储桶名称
```

### 步骤说明

#### 1. 安装和配置
```yaml
- name: Install Wrangler CLI
  run: npm install -g wrangler
  
- name: Configure Wrangler
  run: wrangler config list
```

#### 2. 文件上传示例

**上传单个文件：**
```yaml
- name: Upload test.txt
  run: wrangler r2 object put ${{ env.R2_BUCKET }}/test.txt --file test.txt --remote
```

**上传整个目录：**
```yaml
- name: Upload dist directory
  run: |
    cd dist
    find . -type f -exec wrangler r2 object put ${{ env.R2_BUCKET }}/{} --file {} --remote \;
```

**上传特定类型文件：**
```yaml
- name: Upload HTML files
  run: |
    find . -name "*.html" -exec wrangler r2 object put ${{ env.R2_BUCKET }}/{} --file {} --remote \;
```

### 高级配置

#### 自定义存储路径
```yaml
- name: Upload with custom path
  run: |
    # 上传到指定子目录
    wrangler r2 object put ${{ env.R2_BUCKET }}/assets/logo.png --file ./assets/logo.png --remote
    
    # 上传并重命名
    wrangler r2 object put ${{ env.R2_BUCKET }}/uploads/$(date +%Y%m%d)/backup.txt --file data.txt --remote
```

#### 批量上传脚本
```yaml
- name: Batch upload
  run: |
    # 上传所有静态资源
    for file in $(find . -type f \( -name "*.css" -o -name "*.js" -o -name "*.png" \)); do
      echo "Uploading $file..."
      wrangler r2 object put ${{ env.R2_BUCKET }}/$file --file $file --remote
    done
```

## 调试和验证

### 验证上传
```yaml
- name: Verify upload
  run: |
    echo "Listing files in R2 bucket:"
    wrangler r2 object list ${{ env.R2_BUCKET }} --remote
    
    # 检查特定文件
    wrangler r2 object list ${{ env.R2_BUCKET }} --remote | grep test.txt
```

### 调试信息
```yaml
- name: Debug wrangler
  run: |
    wrangler --version
    wrangler config list
    wrangler r2 bucket list
```

## 完整示例工作流

```yaml
name: Deploy to R2
on:
  push:
    branches: [ main ]

env:
  R2_BUCKET: xiaodouli

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build project
      run: npm run build
      
    - name: Install Wrangler
      run: npm install -g wrangler
      
    - name: Deploy to R2
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      run: |
        # 上传构建结果
        cd dist
        find . -type f -exec wrangler r2 object put ${{ env.R2_BUCKET }}/{} --file {} --remote \;
        
    - name: Invalidate cache (可选)
      run: |
        echo "Deployment completed!"
```

## 常见问题

### 权限错误
确保API Token有以下权限：
- Account:Cloudflare R2:Edit
- Account:Account:Read

### 文件路径问题
- 使用相对路径
- 确保文件存在于工作目录
- 检查文件权限

### 存储桶不存在
在Cloudflare R2控制台先创建存储桶 `xiaodouli`。

## 最佳实践

1. **使用环境变量**：将存储桶名等配置为环境变量
2. **错误处理**：添加验证步骤
3. **缓存控制**：为静态资源设置合适的缓存头
4. **版本控制**：使用Git标签进行版本化部署