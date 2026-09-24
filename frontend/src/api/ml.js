import client from './client';

export const getModelStatus = () => client.get('/ml/model-status');

export const gradeProduce = (formData) =>
  client.post('/ml/grade-produce', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getGradingQueue = () => client.get('/admin/grading/queue');

export const overrideGrading = (recordId, overrideGrade) =>
  client.post(`/admin/grading/${recordId}/override`, {
    override_grade: overrideGrade,
  });

export const submitGradingReview = (id, result) =>
  overrideGrading(id, typeof result === 'object' ? result.grade || result.override_grade : result);

export const getPriceForecast = (params) => {
  if (typeof params === 'object') {
    return client.post('/ml/predict-price', params);
  }
  return client.get(`/ml/predict-price?crop=${encodeURIComponent(params)}`);
};
