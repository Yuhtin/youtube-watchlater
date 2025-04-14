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

    const isBodyString = typeof options.body === 'string';

    const config: RequestInit = {
        method: options.method || 'GET',
        headers,
        body: options.body ? (isBodyString ? options.body : JSON.stringify(options.body)) : undefined,
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(`API error: ${errorData.message || response.statusText}`);
            } catch (e) {
                throw new Error(`API error: ${response.statusText}`);
            }
        }

        const contentType = response.headers.get('content-type');
        if (response.status === 204 || !contentType) {
            return null;
        }

        if (contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}