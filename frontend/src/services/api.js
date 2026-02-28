import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Collections API
export const collectionsApi = {
  getAll: () => api.get('/collections'),
  get: (id) => api.get(`/collections/${id}`),
  create: (data) => api.post('/collections', data),
  update: (id, data) => api.put(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
};

// Inventory API
export const inventoryApi = {
  getAll: (params) => api.get('/inventory', { params }),
  get: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// Wishlist API
export const wishlistApi = {
  getAll: (params) => api.get('/wishlist', { params }),
  get: (id) => api.get(`/wishlist/${id}`),
  create: (data) => api.post('/wishlist', data),
  update: (id, data) => api.put(`/wishlist/${id}`, data),
  delete: (id) => api.delete(`/wishlist/${id}`),
};

// Projects API
export const projectsApi = {
  getAll: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Tasks API
export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Content API
export const contentApi = {
  getAll: (params) => api.get('/content', { params }),
  get: (id) => api.get(`/content/${id}`),
  create: (data) => api.post('/content', data),
  update: (id, data) => api.put(`/content/${id}`, data),
  delete: (id) => api.delete(`/content/${id}`),
};

// Portfolio API
export const portfolioApi = {
  getAll: (params) => api.get('/portfolio', { params }),
  get: (id) => api.get(`/portfolio/${id}`),
  create: (data) => api.post('/portfolio', data),
  update: (id, data) => api.put(`/portfolio/${id}`, data),
  delete: (id) => api.delete(`/portfolio/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecent: (limit) => api.get('/dashboard/recent', { params: { limit } }),
};

// Search API
export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }),
};

// Tags API (auto-discover from all items)
export const tagsApi = {
  getAll: () => api.get('/tags/all'),
};

// Upload API
export const uploadApi = {
  upload: (itemType, itemId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/${itemType}/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (itemType, itemId, fileId) => api.delete(`/upload/${itemType}/${itemId}/${fileId}`),
};

// Crypto Prices API
export const cryptoApi = {
  getPrices: (symbols) => api.get('/crypto/prices', { params: { symbols } }),
  search: (query) => api.get('/crypto/search', { params: { query } }),
  refreshPortfolioPrices: () => api.post('/portfolio/refresh-prices'),
};

// Alerts API
export const alertsApi = {
  getAll: (triggered) => api.get('/alerts', { params: { triggered } }),
  create: (data) => api.post('/alerts', data),
  delete: (id) => api.delete(`/alerts/${id}`),
  check: () => api.post('/alerts/check'),
};

// Links API
export const linksApi = {
  create: (data) => api.post('/links', data),
  delete: (sourceType, sourceId, targetType, targetId) => 
    api.delete('/links', { params: { source_type: sourceType, source_id: sourceId, target_type: targetType, target_id: targetId } }),
  getForItem: (itemType, itemId) => api.get(`/links/${itemType}/${itemId}`),
};

// Custom Types API
export const customTypesApi = {
  getAll: (category) => api.get('/custom-types', { params: { category } }),
  create: (data) => api.post('/custom-types', data),
  update: (id, data) => api.put(`/custom-types/${id}`, data),
  delete: (id) => api.delete(`/custom-types/${id}`),
};

// Managed Tags API
export const managedTagsApi = {
  getAll: () => api.get('/tags/manage'),
  create: (data) => api.post('/tags/manage', data),
  update: (id, data) => api.put(`/tags/manage/${id}`, data),
  delete: (id) => api.delete(`/tags/manage/${id}`),
};

// Auto-discover Tags API
export const tagsApi = {
  getAll: () => api.get('/tags/all'),
};

// Collection items API
export const collectionItemsApi = {
  getItems: (collectionId) => api.get(`/collections/${collectionId}/items`),
};

// Mindmap API
export const mindmapApi = {
  getData: (perspective) => api.get('/mindmap', { params: { perspective } }),
};

// Storage API
export const storageApi = {
  getUsage: () => api.get('/storage/usage'),
};

// Portfolio Transactions API
export const transactionsApi = {
  getAll: (assetId) => api.get('/portfolio/transactions', { params: { asset_id: assetId } }),
  create: (data) => api.post('/portfolio/transactions', data),
  delete: (id) => api.delete(`/portfolio/transactions/${id}`),
};

// Portfolio Snapshots API
export const snapshotsApi = {
  getAll: (months) => api.get('/portfolio/snapshots', { params: { months } }),
  create: () => api.post('/portfolio/snapshots'),
};
