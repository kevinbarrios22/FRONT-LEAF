const BASE_URL = 'http://localhost:8080/api';

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function handleResponse(response) {
    if (response.status === 401) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    if (response.status === 204) return null;

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(body.message || `Error ${response.status}`);
    }

    return body;
}

function normalizePage(response) {
    if (response && response.content) {
        return {
            items: response.content,
            total: response.totalElements,
            pages: response.totalPages,
            page: response.number,
            size: response.size
        };
    }
    return response;
}

async function request(method, endpoint, body = null) {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await handleResponse(response);
    return data === undefined ? data : normalizePage(data);
}

const api = {
    get:    (endpoint)              => request('GET', endpoint),
    post:   (endpoint, body)        => request('POST', endpoint, body),
    put:    (endpoint, body)        => request('PUT', endpoint, body),
    del:    (endpoint)              => request('DELETE', endpoint),
    login:  (username, password)    => request('POST', '/auth/login', { username, password }),
};
