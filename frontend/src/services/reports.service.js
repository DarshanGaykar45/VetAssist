import api from './api.js';

export const reportsService = {
  async getAnalytics() {
    const res = await api.get('/api/reports/analytics');
    return res.data;
  },
};

export default reportsService;
