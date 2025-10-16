# ITAM — Hệ thống Quản lý Tài Sản CNTT

> **IT Asset Management (ITAM)**: Ứng dụng giúp quản lý danh mục thiết bị, dòng thiết bị (Item Master), tài sản thực tế (Asset), thuộc tính kỹ thuật, nhà cung cấp, bảo hành/bảo trì, yêu cầu/ duyệt cấp phát, bảo hành, sửa chữa, thanh lý.
> Stack: **React (Vite) + Ant Design** · **Node.js/Express** · **MySQL** · Deploy **Vercel** (FE) & **Render** (BE)

---

## 📸 Demo

- **Frontend (Vercel)**: `https://front-end-itam.vercel.app`
- **Backend (Render)**: `https://itam-backend.onrender.com`

---

## 🧰 Công nghệ

- **Frontend**: React 18, Vite, Ant Design, React Router, Axios
- **Backend**: Node.js 18+, Express, mysql2, jsonwebtoken, cors, dotenv
- **DB**: MySQL 8.x
- **Triển khai**: Vercel (FE), Render (BE)

---

## 🔐 Xác thực & Phân quyền

- Dùng **JWT** (header `Authorization: Bearer <token>`).
- Middleware `authen.js` kiểm tra token, chặn truy cập nếu không hợp lệ.

## ▶️ Chạy local

```bash

# 1) Backend
cd server
npm i
npm run dev

# 2) Frontend
cd ../client
npm i
npm run dev         # http://localhost:5173
```

---

## 👤 Tác giả

- **Sinh viên**: Trần Minh Tâm
- **Liên hệ**: https://www.facebook.com/tam22102004
