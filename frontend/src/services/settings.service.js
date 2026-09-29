import api from './api.js';

export const settingsService = {
  async getSettings() {
    const res = await api.get('/api/settings');
    return res.data;
  },

  async updateSettings(data) {
    // Return full response so caller can access both .data (settings) and .user (doctor profile)
    return await api.put('/api/settings', data);
  },
};

export default settingsService;
