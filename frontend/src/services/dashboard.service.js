import api from './api.js';

export const dashboardService = {
  async getStats() {
    const res = await api.get('/api/dashboard/stats');
    return res.data;
  },
};

export default dashboardService;
