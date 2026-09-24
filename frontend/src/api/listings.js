import client from './client';

/**
 * Fetch all listings for the logged-in farmer.
 * @param {Object} [params] - e.g. { status: 'open' }
 */
export const getListings = (params) => client.get('/farmer/listings', { params });

/**
 * Fetch a single listing by ID.
 * @param {string} id
 */
export const getListing = (id) => client.get(`/farmer/listings/${id}`);

/**
 * Create a new produce listing (ask).
 * Accepts either a FormData object (for multipart file upload) or a plain JS object.
 * @param {FormData|Object} data
 */
export const createListing = (data) => {
  if (data instanceof FormData) {
    return client.post('/farmer/listings', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
  return client.post('/farmer/listings', data);
};

/**
 * Cancel an open listing.
 * @param {string} id
 */
export const cancelListing = (id) => client.post(`/farmer/listings/${id}/cancel`);
 
/**
 * Fetch all available open farmer produce listings for buyers.
 * @param {Object} [params]
 */
export const getAvailableProduce = (params) => client.get('/buyer/available-produce', { params });
