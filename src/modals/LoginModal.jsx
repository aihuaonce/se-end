import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import "../styles/Login.css"; // 不再需要特定的 Login.css 來處理模態框佈局

export default function LoginModal({ onClose }) { // 接收 onClose prop 用於關閉模態框
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      const res = await fetch("http://localhost:5713/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("userId", data.user.id);    
        localStorage.setItem("userEmail", data.user.email);   
        alert("登入成功！");
        navigate("/"); // 登入成功後導航回首頁，這也會隱式關閉模態框
      }
      else {
        setError(data.message || "登入失敗");
      }
    } catch (err) {
      console.error(err);
      setError("伺服器錯誤，請稍後再試");
    }
  };

  return (
    // 模態框容器：固定定位，佔滿全屏，半透明背景，居中內容
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      {/* 模態框內容框 */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">會員登入</h2>
        <form className="space-y-4" onSubmit={handleSubmit}> {/* 使用 Tailwind space-y */}
          <div className="form-group">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">電子信箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入電子郵件"
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" // Tailwind input styles
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">密碼</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" // Tailwind input styles
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full px-6 py-3 bg-[#C9C2B2] text-white rounded-full font-semibold hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md" // Tailwind button styles
          >
            登入
          </button>
        </form>

        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}

        <p className="text-center mt-4">
          尚未註冊？<span 
            className="text-blue-500 cursor-pointer hover:underline" 
            onClick={() => navigate("/register")} // 導航到註冊頁面，這也會隱式關閉登入模態框
          >
            點我註冊
          </span>
        </p>
        
        {/* 關閉按鈕 */}
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