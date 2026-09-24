import client from './client';

export const getAuctions = (params) => client.get('/admin/auctions', { params });
export const getAuction = (id) => client.get(`/admin/auctions/${id}`);
export const triggerAuction = (payload = {}) => client.post('/admin/trigger-auction', payload);
export const triggerPooling = (payload = {}) => client.post('/admin/trigger-pooling', payload);
export const previewPooling = (params = {}) => client.get('/admin/pooling-preview', { params });
export const getBatches = (params) => client.get('/buyer/batches', { params });
export const getBatch = (id) => client.get(`/buyer/batches/${id}`);
