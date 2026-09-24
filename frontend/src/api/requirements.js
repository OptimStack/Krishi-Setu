import client from './client';

/**
 * Fetch active buyer procurement requirements.
 * Guaranteed at official Mandi modal prices.
 * @param {Object} [params] - e.g. { district: 'Nashik', crop: 'onion' }
 */
export const getRequirements = (params) => client.get('/requirements', { params });

/**
 * Create a new procurement requirement (Buyer only).
 * @param {Object} data - { crop, variety, target_mandi, mandi_modal_price_per_kg, total_quantity_needed_kg, district, delivery_deadline }
 */
export const createRequirement = (data) => client.post('/buyer/requirements', data);

/**
 * Farmer fulfills / supplies a quantity towards a buyer's requirement at the guaranteed Mandi price.
 * @param {string} requirementId
 * @param {Object} data - { quantity_kg, farmer_id, farmer_name, farmer_phone, village }
 */
export const fulfillRequirement = (requirementId, data) =>
  client.post(`/requirements/${requirementId}/fulfill`, data);
