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

/**
 * Fetch incoming buyer bids for the farmer's crops.
 * @param {Object} [params]
 */
export const getIncomingBuyerBids = (params) => client.get('/farmer/buyer-bids', { params });

/**
 * Farmer accepts a buyer's bid, immediately confirming trade and generating payout.
 * @param {Object} data - { bid_id, listing_id }
 */
export const acceptBuyerBid = (data) => client.post('/farmer/accept-bid', data);

/**
 * Buyer confirms instant purchase of an entire farmer lot or pooled batch.
 * @param {string} batchId
 * @param {Object} [data]
 */
export const buyBatchDirect = (batchId, data = {}) => client.post(`/buyer/batches/${batchId}/buy-direct`, data);

