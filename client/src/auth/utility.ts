const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export const apiRequest = async (
    endpoint: string,
    options: {
        method?: string;
        headers?: Record<string, string>;
        body?: any;
        isFormData?: boolean;
    } = {}
) => {
    const { method = 'GET', headers = {}, body, isFormData = false } = options;

    const url = `${BASE_URL}${endpoint}`;

    const token = localStorage.getItem('token');

    const requestHeaders: HeadersInit = {
        ...headers,
    };

    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData && body) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
    };

    if (body) {
        requestOptions.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(url, requestOptions);

        if (response.status === 204) {
            return { success: true };
        }

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
        return {
            success: false,
            message: 'Failed to parse response'
        };
    }
};