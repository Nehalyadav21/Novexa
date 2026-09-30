const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const API_KEY = process.env.WATSONX_API_KEY;
const BASE_URL = (process.env.WATSONX_API_URL || '').replace(/\/$/, '');

let cache = { token: null, expiresAt: 0 };

export async function getIamToken(force = false) {
  const now = Date.now() / 1000;
  if (!force && cache.token && cache.expiresAt - 30 > now) return cache.token;
  
  if (!API_KEY) throw new Error('WATSONX_API_KEY not set in env');
  
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
  params.append('apikey', API_KEY);
  
  const res = await fetch(IAM_URL, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
    body: params.toString() 
  });
  
  if (!res.ok) throw new Error('Failed to get IAM token: ' + await res.text());
  
  const j = await res.json();
  cache.token = j.access_token;
  cache.expiresAt = Math.floor(Date.now() / 1000) + (j.expires_in || 3600);
  return cache.token;
}

export async function callWatsonx(path, payload) {
  const token = await getIamToken();
  const url = BASE_URL + path;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`, 
      'Content-Type': 'application/json', 
      Accept: 'application/json' 
    },
    body: JSON.stringify(payload)
  });
  
  if (res.status === 401) {
    // Token might be expired, try refreshing
    const newToken = await getIamToken(true);
    const retryRes = await fetch(url, { 
      method: 'POST', 
      headers: { 
        Authorization: `Bearer ${newToken}`, 
        'Content-Type': 'application/json', 
        Accept: 'application/json' 
      }, 
      body: JSON.stringify(payload) 
    });
    
    if (!retryRes.ok) throw new Error('Watsonx error: ' + await retryRes.text());
    return retryRes.json();
  }
  
  if (!res.ok) throw new Error('Watsonx error: ' + await res.text());
  return res.json();
}
