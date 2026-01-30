#!/bin/bash

# AI Ignite Note 启动脚本 - 支持本地开发和 Docker 启动

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

kill_port_process() {
    local port=$1
    local service_name=$2

    local pid=$(lsof -ti :$port 2>/dev/null || true)

    if [ -n "$pid" ]; then
        print_warning "检测到端口 $port 被 PID $pid 占用"
        read -p "是否停止占用端口的进程？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "停止进程 $pid ($service_name)..."
            kill -9 $pid 2>/dev/null || true
            sleep 1
            print_success "进程已停止"
        else
            print_error "用户取消操作，无法启动 $service_name"
            exit 1
        fi
    fi
}

check_nodejs() {
    if ! command_exists node; then
        print_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低（当前: $(node -v)，需要: 18+）"
        exit 1
    fi
    print_success "Node.js 版本检查通过: $(node -v)"
}

check_npm() {
    if ! command_exists npm; then
        print_error "npm 未安装"
        exit 1
    fi
    print_success "npm 版本: $(npm -v)"
}

check_docker() {
    if ! command_exists docker; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    print_success "Docker 版本: $(docker --version)"
}

check_docker_compose() {
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    print_success "Docker Compose 已就绪"
}

install_dependencies() {
    print_header "安装依赖"

    print_info "安装前端依赖..."
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "前端依赖安装完成"
    else
        print_info "前端依赖已存在，跳过安装"
    fi

    print_info "安装后端依赖..."
    cd backend
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "后端依赖安装完成"
    else
        print_info "后端依赖已存在，跳过安装"
    fi
    cd ..
}

init_database() {
    print_header "初始化数据库"

    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            print_warning "backend/.env 文件不存在，从 .env.example 复制"
            cp backend/.env.example backend/.env
            print_warning "请编辑 backend/.env 配置数据库连接信息"
        else
            print_error "backend/.env.example 文件不存在"
            exit 1
        fi
    fi

    cd backend

    print_info "生成 Prisma Client..."
    npm run prisma:generate
    print_success "Prisma Client 生成完成"

    print_info "运行数据库迁移..."
    npm run prisma:migrate
    print_success "数据库迁移完成"

    read -p "是否运行种子数据？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "运行种子数据..."
        npm run prisma:seed
        print_success "种子数据运行完成"
    fi

    cd ..
}

start_frontend() {
    print_header "启动前端服务"

    kill_port_process 3200 "前端服务"

    print_info "前端地址: http://localhost:3200"
    npm run dev
}

start_backend() {
    print_header "启动后端服务"

    kill_port_process 4000 "后端服务"

    print_info "后端地址: http://localhost:4000"
    print_info "API 文档: http://localhost:4000/api"
    cd backend
    npm run dev
}

start_all() {
    print_header "启动所有服务（前端 + 后端）"

    kill_port_process 4000 "后端服务"

    cd backend
    print_info "启动后端服务（后台运行）..."
    npm run dev &
    BACKEND_PID=$!
    cd ..

    print_info "等待后端服务启动..."
    sleep 5

    kill_port_process 3200 "前端服务"

    print_info "启动前端服务..."
    print_success "后端 PID: $BACKEND_PID"
    print_info "前端地址: http://localhost:3200"
    print_info "后端地址: http://localhost:4000"
    print_info "按 Ctrl+C 停止所有服务"
    npm run dev

    kill $BACKEND_PID 2>/dev/null || true
}

start_docker() {
    print_header "使用 Docker Compose 启动"

    if [ ! -f ".env" ]; then
        if [ -f ".env.docker.example" ]; then
            print_warning ".env 文件不存在，从 .env.docker.example 复制"
            cp .env.docker.example .env
            print_warning "请编辑 .env 配置环境变量（尤其是 AI API 密钥）"
        else
            print_error ".env.docker.example 文件不存在"
            exit 1
        fi
    fi

    print_info "启动 Docker Compose 服务..."
    docker-compose up -d

    print_success "Docker Compose 启动成功"
    print_info "服务地址:"
    print_info "  - 前端: http://localhost:3200"
    print_info "  - 后端: http://localhost:4000"
    print_info "  - 健康检查: http://localhost:4000/health"
    print_info "  - 数据库: localhost:5434"

    read -p "是否初始化数据库？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "初始化数据库..."
        docker-compose exec backend npx prisma migrate deploy
        print_success "数据库初始化完成"
    fi

    print_info "查看日志: docker-compose logs -f"
    print_info "停止服务: docker-compose down"
}

stop_docker() {
    print_header "停止 Docker 服务"
    docker-compose down
    print_success "Docker 服务已停止"
}

stop_services() {
    print_header "停止本地服务"

    local frontend_pid=$(lsof -ti :3200 2>/dev/null || true)
    local backend_pid=$(lsof -ti :4000 2>/dev/null || true)

    if [ -n "$frontend_pid" ]; then
        print_info "停止前端服务 (PID: $frontend_pid)..."
        kill -9 $frontend_pid 2>/dev/null && print_success "前端服务已停止"
    else
        print_info "前端服务未运行"
    fi

    if [ -n "$backend_pid" ]; then
        print_info "停止后端服务 (PID: $backend_pid)..."
        kill -9 $backend_pid 2>/dev/null && print_success "后端服务已停止"
    else
        print_info "后端服务未运行"
    fi
}

show_help() {
    cat << EOF
AI Ignite Note - 启动脚本

用法: ./start.sh [选项]

选项:
    frontend     仅启动前端服务
    backend      仅启动后端服务
    all          同时启动前端和后端服务（默认）
    stop         停止本地服务（前端 + 后端）
    docker       使用 Docker Compose 启动
    docker-stop  停止 Docker 服务
    install      仅安装依赖
    init-db      仅初始化数据库
    help         显示此帮助信息

示例:
    ./start.sh              # 启动所有服务（前端 + 后端）
    ./start.sh frontend     # 仅启动前端
    ./start.sh backend      # 仅启动后端
    ./start.sh stop         # 停止本地服务
    ./start.sh docker       # 使用 Docker 启动
    ./start.sh install      # 安装依赖
    ./start.sh init-db      # 初始化数据库

更多信息请参考 README.md

EOF
}

main() {
    print_header "AI Ignite Note 启动脚本"

    case "${1:-all}" in
        frontend)
            check_nodejs
            check_npm
            start_frontend
            ;;
        backend)
            check_nodejs
            check_npm
            start_backend
            ;;
        all)
            check_nodejs
            check_npm

            if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ]; then
                read -p "检测到缺少依赖，是否安装？(y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    install_dependencies
                fi
            fi

            if [ ! -d "backend/node_modules/@prisma" ]; then
                read -p "检测到未初始化数据库，是否初始化？(y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    init_database
                fi
            fi

            start_all
            ;;
        stop)
            stop_services
            ;;
        docker)
            check_docker
            check_docker_compose
            start_docker
            ;;
        docker-stop)
            stop_docker
            ;;
        install)
            check_nodejs
            check_npm
            install_dependencies
            print_success "依赖安装完成"
            ;;
        init-db)
            check_nodejs
            check_npm
            init_database
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
