// frontend/src/modals/LoginModal.jsx
import React, { useState } from "react";
import axios from 'axios'; // 引入 axios
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5713/api';

export default function LoginModal({ onClose, onLoginSuccess, onShowRegister }) {
  const [username, setUsername] = useState(""); // 注意：現在是 username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password,
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        alert("登入成功！");
        onLoginSuccess(); // 通知 App.jsx 登入成功
        onClose(); // 關閉模態框
        navigate('/projectall'); // 登入成功後導向專案列表頁面
      } else {
        setError(response.data.message || '登入失敗，請稍後再試。');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        setError(err.response.data.message || '登入失敗，請檢查使用者名稱和密碼。');
      } else {
        setError('網路錯誤或伺服器無回應。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    onClose(); // 先關閉登入模態框
    onShowRegister(); // 然後打開註冊模態框
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm relative">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">系統登入</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">使用者名稱</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="請輸入使用者名稱"
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">密碼</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-700 transition duration-300 ease-in-out shadow-md"
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}

        <p className="text-center mt-4">
          還沒有帳號？
          <button
            type="button"
            className="text-blue-500 cursor-pointer hover:underline ml-1"
            onClick={handleRegisterClick}
          >
            立即註冊
          </button>
        </p>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition duration-300 ease-in-out"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}