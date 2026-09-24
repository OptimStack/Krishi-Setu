import client from './client';

export const getNearbyWarehouses = (params = {}) => client.get('/warehouse/nearby', { params });
export const getWarehouseDetail = (id) => client.get(`/warehouse/${id}`);
export const seedWarehouses = () => client.post('/warehouse/seed');
