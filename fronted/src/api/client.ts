import { getApiUrl } from '../config/api';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: any;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const getToken = (): string | null => {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, body, ...restOptions } = options;

  let url = getApiUrl(endpoint);

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {};
  if (body && typeof body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
  } else if (body && !(body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    body: body && typeof body !== 'string' && !(body instanceof FormData)
      ? JSON.stringify(body)
      : (body as BodyInit),
    ...restOptions,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText || 'API Request failed' };
    }
    const detail =
      errorData.error ||
      errorData.message ||
      (errorData.errors ? (Array.isArray(errorData.errors) ? errorData.errors.join(', ') : Object.values(errorData.errors).flat().join(', ')) : null) ||
      errorData.title ||
      `Request failed with status ${response.status}`;
    throw new ApiError(
      detail,
      response.status,
      errorData
    );
  }

  // Handle 24 NO CONTENT
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}
