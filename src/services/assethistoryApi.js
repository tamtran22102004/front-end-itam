// src/services/historyApi.js
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;
const withAuth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

export async function apiGetAssetHistory() {
  const url = `${API_URL}/api/asset/assethistory`;
  const res = await axios.get(url, withAuth());
  const data = Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
    ? res.data
    : [];
  return data;
}
