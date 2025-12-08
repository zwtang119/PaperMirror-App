#!/bin/bash

# PaperMirror 代理服务部署脚本
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查Google Cloud CLI
if ! command_exists gcloud; then
    print_error "未找到 gcloud CLI"
    echo "请安装 Google Cloud SDK:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_success "✅ 找到 gcloud CLI"

# 检查Docker
if ! command_exists docker; then
    print_warning "未找到 Docker，某些功能可能受限"
else
    print_success "✅ 找到 Docker"
fi

# 检查Node.js
if ! command_exists node; then
    print_error "未找到 Node.js"
    echo "请安装 Node.js 18 或更高版本"
    exit 1
fi

print_success "✅ 找到 Node.js"

# 检查npm
if ! command_exists npm; then
    print_error "未找到 npm"
    echo "请安装 npm"
    exit 1
fi

print_success "✅ 找到 npm"

# 检查当前目录
if [ ! -f "package.json" ] || [ ! -f "proxy.js" ]; then
    print_error "当前目录不是 PaperMirror 代理服务目录"
    echo "请确保在包含 package.json 和 proxy.js 的目录中运行此脚本"
    exit 1
fi

print_success "✅ 当前目录正确"

# 安装依赖
print_info "📦 安装依赖..."
npm install
print_success "✅ 依赖安装完成"

# Google Cloud 认证
echo ""
print_info "🔐 Google Cloud 认证"
echo "请确保您已登录 Google Cloud 并且有合适的项目"

# 检查当前项目
echo ""
print_info "📋 当前 Google Cloud 项目:"
gcloud config get-value project

echo ""
read -p "是否需要切换项目? (y/N): " switch_project
if [[ $switch_project =~ ^[Yy]$ ]]; then
    gcloud projects list
    read -p "请输入项目ID: " project_id
    gcloud config set project $project_id
    print_success "✅ 已切换到项目: $project_id"
fi

# 启用必要的API
echo ""
print_info "🔧 启用必要的 API..."
gcloud services enable run.googleapis.com
print_success "✅ Cloud Run API 已启用"

gcloud services enable cloudbuild.googleapis.com
print_success "✅ Cloud Build API 已启用"

gcloud services enable artifactregistry.googleapis.com
print_success "✅ Artifact Registry API 已启用"

# 设置区域
echo ""
print_info "🌍 设置部署区域"
read -p "请选择部署区域 (默认: us-central1): " region
region=${region:-us-central1}
print_success "✅ 部署区域: $region"

# 输入Gemini API密钥
echo ""
print_info "🔑 配置 Gemini API 密钥"
read -sp "请输入您的 Gemini API 密钥: " gemini_api_key
echo ""

if [ -z "$gemini_api_key" ]; then
    print_error "API 密钥不能为空"
    exit 1
fi

# 部署到Cloud Run
echo ""
print_info "🚀 部署到 Google Cloud Run..."
echo "这可能需要几分钟时间，请耐心等待..."

# 构建部署命令
deploy_cmd="gcloud run deploy papermirror-proxy"
deploy_cmd="$deploy_cmd --source ."
deploy_cmd="$deploy_cmd --allow-unauthenticated"
deploy_cmd="$deploy_cmd --memory=512Mi"
deploy_cmd="$deploy_cmd --cpu=1"
deploy_cmd="$deploy_cmd --max-instances=10"
deploy_cmd="$deploy_cmd --min-instances=0"
deploy_cmd="$deploy_cmd --region=$region"
deploy_cmd="$deploy_cmd --set-env-vars GEMINI_API_KEY=$gemini_api_key"
deploy_cmd="$deploy_cmd --set-env-vars NODE_ENV=production"

# 执行部署
if $deploy_cmd; then
    print_success "✅ 部署成功!"
    
    # 获取服务URL
    service_url=$(gcloud run services describe papermirror-proxy --region=$region --format='value(status.url)')
    
    echo ""
    print_success "🎉 部署完成!"
    echo ""
    echo "📋 部署信息:"
    echo "   服务名称: papermirror-proxy"
    echo "   服务地址: $service_url"
    echo "   部署区域: $region"
    echo ""
    echo "🧪 测试命令:"
    echo "   curl $service_url/health"
    echo ""
    echo "📊 查看日志:"
    echo "   gcloud run services logs read papermirror-proxy --region=$region"
    echo ""
    echo "🔄 重新部署:"
    echo "   修改代码后，再次运行此脚本即可"
    echo ""
    
    # 保存配置
    cat > service-config.json << EOF
{
  "serviceName": "papermirror-proxy",
  "serviceUrl": "$service_url",
  "region": "$region",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "deployed"
}
EOF
    
    print_success "✅ 配置已保存到 service-config.json"
    
else
    print_error "部署失败"
    echo "请检查错误信息并确保:"
    echo "1. 您有合适的 Google Cloud 权限"
    echo "2. 项目已启用计费功能"
    echo "3. API 密钥有效"
    exit 1
fi