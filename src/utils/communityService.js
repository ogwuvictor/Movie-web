export async function communityRequest(path, { method = 'GET', data, csrf, signal } = {}) {
  const response = await fetch('/api/community/' + path, {
    method, credentials: 'same-origin', signal,
    headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const error = new Error(result?.error || 'Unable to connect to the account service. Please try again.');
    error.status = response.status; throw error;
  }
  const endpoint = path.split('?')[0];
  if (method === 'GET' && (
    (endpoint === 'session' && (!Object.prototype.hasOwnProperty.call(result, 'user') || typeof result.csrf !== 'string')) ||
    (endpoint === 'reviews' && (!Array.isArray(result.reviews) || !Number.isInteger(result.summary?.count))) ||
    (endpoint === 'library' && !Array.isArray(result.items)) ||
    (endpoint === 'title' && !Array.isArray(result.lists))
  )) throw new Error('Unable to connect to the account service. Please try again.');
  return result;
}
