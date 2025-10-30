// services/api.js
import axios from "axios";
const API_URL = import.meta.env.VITE_BACKEND_URL;

// ---- GET masters ----
export const apiGetAssets = async () => {
  const res = await axios.get(`${API_URL}/api/asset`);
  return Array.isArray(res.data) ? res.data : res.data?.data || [];
};
export const apiGetCategories = async () => {
  const res = await axios.get(`${API_URL}/api/category`);
  return res.data?.data || [];
};
export const apiGetItemMasters = async () => {
  const res = await axios.get(`${API_URL}/api/items`);
  return Array.isArray(res.data) ? res.data : res.data?.data || [];
};
export const apiGetVendors = async () => {
  const res = await axios.get(`${API_URL}/api/vendor`);
  return res.data?.data || [];
};
export const apiGetUsers = async () => {
  const res = await axios.get(`${API_URL}/api/getuserinfo`);
  return Array.isArray(res.data) ? res.data : res.data?.data || [];
};
export const apiGetDepartments = async () => {
  const res = await axios.get(`${API_URL}/api/getdepartment`);
  return Array.isArray(res.data) ? res.data : res.data?.data || [];
};

// ---- Asset mutations ----
export const apiAddAsset = (payload) =>
  axios.post(`${API_URL}/api/asset/add`, payload);
export const apiUpdateAsset = (id, payload) =>
  axios.post(`${API_URL}/api/asset/update/${id}`, payload);
export const apiDeleteAsset = (id) =>
  axios.post(`${API_URL}/api/asset/delete/${id}`);
