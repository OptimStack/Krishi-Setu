import client from './client';

/**
 * Fetch bids for the logged-in buyer.
 * @param {Object} [params] - e.g. { status: 'open' }
 */
export const getBids = (params) => client.get('/buyer/bids', { params });

/**
 * Fetch a single bid by ID.
 * @param {string} id
 */
export const getBid = (id) => client.get(`/buyer/bids/${id}`);

/**
 * Create a new buying bid.
 * @param {Object} data - { crop, quantity_needed_kg, max_price_per_kg, min_quality_grade, batch_id }
 */
export const createBid = (data) => client.post('/buyer/bids', data);

/**
 * Cancel an open bid.
 * @param {string} id
 */
export const cancelBid = (id) => client.post(`/buyer/bids/${id}/cancel`);

/**
 * Browse available pooled batches for bidding.
 * @param {Object} [params] - e.g. { crop: 'Wheat', quality_grade: 'A' }
 */
export const getBatches = (params) => client.get('/buyer/batches', { params });

/**
 * Fetch details of a single pooled batch.
 * @param {string} id
 */
export const getBatch = (id) => client.get(`/buyer/batches/${id}`);
