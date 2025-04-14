const BASE_URL = 'http://localhost:3000';

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

export async function apiRequest(endpoint: string, options: ApiOptions = {}) {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        if (response.headers.get('content-type')?.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}