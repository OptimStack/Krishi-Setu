import client from './client';

export const getPayouts = () => client.get('/farmer/payouts');
export const getFarmerPayouts = () => client.get('/farmer/payouts');
export const getBuyerTrades = () => client.get('/buyer/trades');
export const createPaymentOrder = (tradeId) => client.post('/payments/create-order', { trade_id: tradeId });
export const verifyPayment = (paymentData) => client.post('/payments/verify', paymentData);
export const getTradePayment = (tradeId) => client.get(`/payments/trade/${tradeId}`);
