import React, { useState } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5713/api';

export default function RegisterModal({ onClose, onShowLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('密碼和確認密碼不一致。');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/register`, {
        username,
        email,
        password,
        // role: 'staff', // 如果需要，可以固定或提供選項
      });

      if (response.data.success) {
        setSuccessMessage('註冊成功！您現在可以登入了。');
        setTimeout(() => {
          onClose(); // 關閉註冊模態框
          onShowLogin(); // 打開登入模態框
        }, 2000);
      } else {
        setError(response.data.message || '註冊失敗，請稍後再試。');
      }
    } catch (err) {
      console.error('Register error:', err);
      if (err.response) {
        setError(err.response.data.message || '註冊失敗，請檢查輸入資訊。');
      } else {
        setError('網路錯誤或伺服器無回應。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    onClose(); // 先關閉註冊模態框
    onShowLogin(); // 然後打開登入模態框
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm relative">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">註冊新帳號</h2>
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
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">電子郵件</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入電子郵件"
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
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
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">確認密碼</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="請再次輸入密碼"
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition duration-300 ease-in-out shadow-md"
            disabled={loading}
          >
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>

        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm text-center mt-4">{successMessage}</p>}

        <p className="text-center mt-4">
          已經有帳號了？
          <button
            type="button"
            className="text-blue-500 cursor-pointer hover:underline ml-1"
            onClick={handleLoginClick}
          >
            前往登入
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