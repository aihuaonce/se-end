import React, { useState } from "react";
import { Heart, LogIn as LogInIcon, User, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5713/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("userId", data.user.id);    // ✅ 正確儲存顧客id
        localStorage.setItem("userEmail", data.user.email);    // ✅ 儲存顧客 ID（給預約使用）
        alert("登入成功！");
        navigate("/"); // 回首頁
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
    <div className="wedding-container">


      <main className="main-content">
        <section className="login-section">
          <h2 className="hero-title">管理員登入</h2>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">電子信箱</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="請輸入電子郵件"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">密碼</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                required
              />
            </div>
            <button type="submit" className="add-button">登入</button>
          </form>

          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

          <p style={{ marginTop: "10px" }}>
            尚未註冊？<span style={{ color: "blue", cursor: "pointer" }} onClick={() => navigate("/register")}>點我註冊</span>
          </p>
        </section>
      </main>


    </div>
  );
}