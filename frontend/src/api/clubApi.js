import axiosInstance from './axiosInstance';

export const submitClubRegistration = (data) => 
  axiosInstance.post('/clubs', data);

export const getAllClubs = () => 
  axiosInstance.get('/clubs');

export const getMyClub = () => 
  axiosInstance.get('/clubs/my-club');

export const getClubMembers = (id) => 
  axiosInstance.get(`/clubs/${id}/members`);

export const joinClub = (id) => 
  axiosInstance.post(`/clubs/${id}/join`);

export const treasurerApproveClub = (id) => 
  axiosInstance.patch(`/clubs/${id}/treasurer-approve`);

export const treasurerRejectClub = (id, reason) => 
  axiosInstance.patch(`/clubs/${id}/treasurer-reject`, { reason });

export const deanApproveClub = (id) => 
  axiosInstance.patch(`/clubs/${id}/dean-approve`);

export const deanRejectClub = (id, reason) => 
  axiosInstance.patch(`/clubs/${id}/dean-reject`, { reason });

export const getLecturerClubs = () => 
  axiosInstance.get('/lecturer/clubs');
