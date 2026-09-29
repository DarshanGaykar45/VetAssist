import api from './api.js';

export const farmerService = {
  getAll(params) {
    return api.get('/api/farmers', params).then((res) => res.data);
  },

  getById(id) {
    return api.get(`/api/farmers/${id}`).then((res) => res.data);
  },

  create(data) {
    return api.post('/api/farmers', data).then((res) => res.data);
  },

  update(id, data) {
    return api.put(`/api/farmers/${id}`, data).then((res) => res.data);
  },

  delete(id) {
    return api.delete(`/api/farmers/${id}`).then((res) => res.data);
  },

  // Sub-routes for nested cows
  addCow(farmerId, cowData) {
    return api.post(`/api/farmers/${farmerId}/cows`, cowData).then((res) => res.data);
  },

  updateCow(farmerId, cowId, cowData) {
    return api.put(`/api/farmers/${farmerId}/cows/${cowId}`, cowData).then((res) => res.data);
  },

  deleteCow(farmerId, cowId) {
    return api.delete(`/api/farmers/${farmerId}/cows/${cowId}`).then((res) => res.data);
  },
};

export default farmerService;
