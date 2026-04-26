import axiosInstance from './axiosInstance';

export const createEvent = (data) => axiosInstance.post('/events', data);

export const updateEvent = (id, data) => axiosInstance.put(`/events/${id}`, data);

export const cancelEvent = (id) => axiosInstance.patch(`/events/${id}/cancel`);

export const getEventById = (id) => axiosInstance.get(`/events/${id}`);

export const getMyEvents = () => axiosInstance.get('/events/user/my-events');
