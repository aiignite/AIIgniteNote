# Docker 国内镜像部署指南

## 📋 概述
本指南帮助您在国内网络环境下快速部署 AI Ignite Note 项目。

## 🔧 配置步骤

### 步骤 1: 配置 Docker daemon 镜像加速

#### macOS (Docker Desktop)
1. 打开 Docker Desktop
2. 进入 **Settings** → **Docker Engine**
3. 将以下配置添加到 JSON 配置中：

```json
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://docker.anyhub.us.kg",
    "https://docker.chenby.cn",
    "https://docker.awsl9527.cn"
  ],
  "dns": ["8.8.8.8", "114.114.114.114"]
}
```

4. 点击 **Apply & Restart** 重启 Docker

#### Linux 系统
1. 编辑或创建 Docker daemon 配置文件：
```bash
sudo vim /etc/docker/daemon.json
```

2. 添加以下内容：
```json
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://docker.anyhub.us.kg",
    "https://docker.chenby.cn",
    "https://docker.awsl9527.cn"
  ],
  "dns": ["8.8.8.8", "114.114.114.114"]
}
```

3. 重启 Docker 服务：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

#### Windows (Docker Desktop)
1. 右键点击任务栏 Docker 图标
2. 选择 **Settings** → **Docker Engine**
3. 添加上述镜像配置
4. 点击 **Apply & Restart**

### 步骤 2: 验证镜像配置

运行以下命令验证镜像源是否配置成功：
```bash
docker info
```

查看输出中是否包含 `Registry Mirrors` 配置。

### 步骤 3: 使用国内基础镜像（可选）

如果需要进一步加速，可以使用国内镜像源的基础镜像。编辑 `docker-compose.yml`：

```yaml
services:
  postgres:
    image: registry.cn-hangzhou.aliyuncs.com/library/postgres:15-alpine
    # 或使用
    # image: swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/postgres:15-alpine
```

### 步骤 4: 构建和启动

现在可以使用国内镜像源构建和启动项目：

```bash
# 构建并启动所有服务
docker-compose up --build -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

## 📦 项目已配置的国内镜像

项目的 Dockerfile 已自动配置以下国内镜像源：

### npm 镜像源
- 淘宝 npm 镜像: `https://registry.npmmirror.com`

### 推荐的其他国内镜像源

#### Docker 镜像加速器
- 阿里云: `https://registry.cn-hangzhou.aliyuncs.com`
- 腾讯云: `https://mirror.ccs.tencentyun.com`
- 网易云: `https://hub-mirror.c.163.com`
- 百度云: `https://mirror.baidubce.com`
- 1Panel: `https://docker.1panel.live`

#### npm 镜像源
- 淘宝: `https://registry.npmmirror.com`
- 华为云: `https://repo.huaweicloud.com/repository/npm/`
- 腾讯云: `https://mirrors.cloud.tencent.com/npm/`

## 🚀 快速部署命令

```bash
# 1. 配置环境变量（首次部署）
cp .env.docker.example .env

# 2. 编辑环境变量
vim .env

# 3. 构建并启动
docker-compose up --build -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f
```

## 🐛 常见问题

### 问题 1: 镜像拉取失败
**解决方案**: 检查网络连接，尝试更换其他镜像源。

### 问题 2: npm install 缓慢
**解决方案**: Dockerfile 已配置淘宝 npm 镜像，如仍有问题可尝试：
```bash
docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t aiignitenote-frontend .
```

### 问题 3: 容器启动失败
**解决方案**: 查看详细日志：
```bash
docker-compose logs [service_name]
```

## 📚 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [淘宝 npm 镜像](https://npmmirror.com/)
