const BASE_URL = '/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  const headers = isFormData
    ? {} // Let browser set Content-Type with boundary for FormData
    : { 'Content-Type': 'application/json', ...options.headers };

  const config = {
    credentials: 'include',
    ...options,
    headers,
  };

  const res = await fetch(url, config);
  const json = await res.json();

  if (!json.success) {
    const error = new Error(json.error || 'Something went wrong');
    error.code = json.code;
    error.status = res.status;
    throw error;
  }

  return json.data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) =>
    body instanceof FormData
      ? request(path, { method: 'POST', body })
      : request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
