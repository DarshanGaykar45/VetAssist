import api from './api.js';

export const inseminationService = {
  getAll(params) {
    return api.get('/api/inseminations', params).then((res) => res.data);
  },

  getById(id) {
    return api.get(`/api/inseminations/${id}`).then((res) => res.data);
  },

  create(data) {
    return api.post('/api/inseminations', data);
  },

  resendWhatsApp(id) {
    return api.post(`/api/inseminations/${id}/resend-whatsapp`);
  },

  toggleSent(id) {
    return api.patch(`/api/inseminations/${id}/toggle-sent`);
  },
};

export default inseminationService;
