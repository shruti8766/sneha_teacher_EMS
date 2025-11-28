// import { BASE_URL } from '../constants';

// interface RequestOptions extends RequestInit {
//   auth?: boolean;
// }

// export const api = {
//   request: async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
//     const { auth = true, headers, ...rest } = options;
    
//     const defaultHeaders: HeadersInit = {
//       'Content-Type': 'application/json',
//     };

//     if (auth) {
//       const sessionId = localStorage.getItem('sessionId');
//       if (sessionId) {
//         defaultHeaders['Authorization'] = `Bearer ${sessionId}`;
//       }
//     }

//     const response = await fetch(`${BASE_URL}${path}`, {
//       headers: { ...defaultHeaders, ...headers },
//       ...rest,
//     });

//     if (response.status === 401) {
//       // Handle Unauthorized globally
//       localStorage.removeItem('sessionId');
//       localStorage.removeItem('user');
//       window.location.hash = '/login';
//       throw new Error('Session expired. Please login again.');
//     }

//     const data = await response.json();

//     if (!response.ok || (data && data.ok === false)) {
//       throw new Error(data.error || `API Error: ${response.statusText}`);
//     }

//     return data as T;
//   },

//   get: <T>(path: string, auth = true) => api.request<T>(path, { method: 'GET', auth }),
  
//   post: <T>(path: string, body: any, auth = true) => 
//     api.request<T>(path, { method: 'POST', body: JSON.stringify(body), auth }),
  
//   put: <T>(path: string, body: any, auth = true) => 
//     api.request<T>(path, { method: 'PUT', body: JSON.stringify(body), auth }),
  
//   delete: <T>(path: string, auth = true) => 
//     api.request<T>(path, { method: 'DELETE', auth }),
// };
import { BASE_URL } from '../constants';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export const api = {
  request: async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { auth = true, headers, ...rest } = options;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (auth) {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        defaultHeaders['Authorization'] = `Bearer ${sessionId}`;
      }
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { ...defaultHeaders, ...headers },
      ...rest,
    });

    if (response.status === 401) {
      // Handle Unauthorized globally
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      window.location.hash = '/login';
      throw new Error('Session expired. Please login again.');
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses (HTML errors, etc.)
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // If response is OK but not JSON, return empty success object
      return { ok: true } as T;
    }

    if (!response.ok || (data && data.ok === false)) {
      throw new Error(data.error || `API Error: ${response.statusText}`);
    }

    return data as T;
  },

  get: <T>(path: string, auth = true) => api.request<T>(path, { method: 'GET', auth }),
  
  post: <T>(path: string, body: any, auth = true) => 
    api.request<T>(path, { method: 'POST', body: JSON.stringify(body), auth }),
  
  put: <T>(path: string, body: any, auth = true) => 
    api.request<T>(path, { method: 'PUT', body: JSON.stringify(body), auth }),
  
  delete: <T>(path: string, auth = true) => 
    api.request<T>(path, { method: 'DELETE', auth }),
};