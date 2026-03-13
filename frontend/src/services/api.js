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
export { api };
// Auth API
export const authApi = {
  me: () => api.get('/auth/me'),
  updateAccount: (data) => api.put('/auth/account', data),
};

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
  getItemsByTag: (tagName) => api.get(`/tags/${encodeURIComponent(tagName)}/items`),
};

// Upload API (legacy compat)
export const uploadApi = {
  upload: (itemType, itemId, file, previewOnCard = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview_on_card', String(!!previewOnCard));
    return api.post(`/upload/${itemType}/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (itemType, itemId, fileId) => api.delete(`/upload/${itemType}/${itemId}/${fileId}`),
};

// Media API (file + link + floating + preview)
export const mediaApi = {
  list: (params) => api.get('/media', { params }),
  upload: ({ file, itemType, itemId, isFloating = false, previewOnCard = false, title = '' }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (itemType) formData.append('item_type', itemType);
    if (itemId) formData.append('item_id', itemId);
    formData.append('is_floating', String(!!isFloating));
    formData.append('preview_on_card', String(!!previewOnCard));
    if (title) formData.append('title', title);
    return api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  createLink: (data) => api.post('/media/link', data),
  update: (id, data) => api.put(`/media/${id}`, data),
  attach: (id, itemType, itemId) => api.post(`/media/${id}/attach`, { item_type: itemType, item_id: itemId }),
  detach: (id, itemType, itemId) => api.delete(`/media/${id}/attach`, { params: { item_type: itemType, item_id: itemId } }),
  delete: (id) => api.delete(`/media/${id}`),
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
  update: (id, data) => api.put(`/alerts/${id}`, data),
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

// Collection items API
export const collectionItemsApi = {
  getItems: (collectionId) => api.get(`/collections/${collectionId}/items`),
};

// Mindmap API
export const mindmapApi = {
  getData: (perspective) => api.get('/mindmap', { params: { perspective } }),
  getViewState: () => api.get('/mindmap/view-state'),
  saveViewState: (data) => api.put('/mindmap/view-state', data),
};

// Storage API
export const storageApi = {
  getUsage: () => api.get('/storage/usage'),
  getSettings: () => api.get('/storage/settings'),
  setStoragePath: (path) => api.put('/storage/path', { path }),
  exportAll: () => api.post('/data/export', {}, { responseType: 'blob' }),
  importAll: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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

// Portfolio V2 API (account/site/object centric)
export const portfolioV2Api = {
  getStatus: () => api.get('/portfolio-v2/status'),
  createStatus: (data) => api.post('/portfolio-v2/status', data),
  updateStatus: (id, data) => api.put(`/portfolio-v2/status/${id}`, data),
  deleteStatus: (id) => api.delete(`/portfolio-v2/status/${id}`),

  getRecap: () => api.get('/portfolio-v2/recap'),

  getDeposits: (accountName) => api.get('/portfolio-v2/deposits', { params: { account_name: accountName } }),
  createDeposit: (data) => api.post('/portfolio-v2/deposits', data),
  updateDeposit: (id, data) => api.put(`/portfolio-v2/deposits/${id}`, data),
  deleteDeposit: (id) => api.delete(`/portfolio-v2/deposits/${id}`),

  getSales: () => api.get('/portfolio-v2/sales'),
  createSale: (data) => api.post('/portfolio-v2/sales', data),
  updateSale: (id, data) => api.put(`/portfolio-v2/sales/${id}`, data),
  deleteSale: (id) => api.delete(`/portfolio-v2/sales/${id}`),

  getPhysicalAssets: () => api.get('/portfolio-v2/physical-assets'),
  createPhysicalAsset: (data) => api.post('/portfolio-v2/physical-assets', data),
  updatePhysicalAsset: (id, data) => api.put(`/portfolio-v2/physical-assets/${id}`, data),
  deletePhysicalAsset: (id) => api.delete(`/portfolio-v2/physical-assets/${id}`),

  getSnapshots: () => api.get('/portfolio-v2/snapshots'),
  createSnapshot: (data) => api.post('/portfolio-v2/snapshots', data),
  updateSnapshot: (id, data) => api.put(`/portfolio-v2/snapshots/${id}`, data),
  deleteSnapshot: (id) => api.delete(`/portfolio-v2/snapshots/${id}`),
};
// Calendar API
export const calendarApi = {
  getEvents: () => api.get('/calendar/events'),
};





