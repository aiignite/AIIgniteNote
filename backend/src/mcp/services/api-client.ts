/**
 * MCP Server HTTP API 客户端
 * 
 * 通过用户名密码登录后端，获取 JWT Token 进行 API 调用。
 * 不直接访问数据库，保证安全性。
 */

const API_TIMEOUT = 30000;

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/** 获取 API 基础 URL */
function getApiBaseUrl(): string {
  return process.env.MCP_API_URL || 'http://localhost:3215/api';
}

/** 使用用户名密码登录，获取 JWT Token */
async function login(): Promise<string> {
  const email = process.env.MCP_USER_EMAIL;
  const password = process.env.MCP_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      '缺少认证信息: 请设置环境变量 MCP_USER_EMAIL 和 MCP_USER_PASSWORD'
    );
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(API_TIMEOUT),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `登录失败 (${response.status}): ${(error as any)?.error?.message || '请检查用户名密码'}`
    );
  }

  const result = await response.json() as any;
  if (!result.success || !result.data?.accessToken) {
    throw new Error('登录响应格式异常');
  }

  cachedToken = result.data.accessToken;
  // Token 缓存 50 分钟（假设有效期 1 小时）
  tokenExpiry = Date.now() + 50 * 60 * 1000;

  console.error(`已登录用户: ${result.data.user?.email}`);
  return cachedToken!;
}

/** 获取有效的 Token（自动登录/续期） */
async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  return login();
}

/** 发起 API 请求（自动携带 Token） */
export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: Record<string, any>,
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<{ success: boolean; data?: T; meta?: any; error?: any }> {
  const token = await getToken();
  const baseUrl = getApiBaseUrl();

  // 构建 URL
  let url = `${baseUrl}${path}`;
  if (queryParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(API_TIMEOUT),
  });

  const result = await response.json() as any;

  if (!response.ok || !result.success) {
    // Token 过期时自动重登
    if (response.status === 401 && cachedToken) {
      cachedToken = null;
      tokenExpiry = 0;
      return apiRequest(method, path, body, queryParams);
    }
    return {
      success: false,
      error: result.error || { code: 'API_ERROR', message: `请求失败 (${response.status})` },
    };
  }

  return { success: true, data: result.data, meta: result.meta };
}

/** 检查登录连通性 */
export async function checkConnection(): Promise<void> {
  await getToken();
}
