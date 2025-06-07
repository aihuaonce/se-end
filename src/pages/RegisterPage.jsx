import React, { useState } from "react";
import { Heart, LogIn as LogInIcon, User, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        style: "",
        birthday: "",
        password: ""
    });
    const navigate = useNavigate();
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const today = new Date().toISOString().split("T")[0]; // 建檔時間

        try {
            const res = await fetch("http://localhost:5713/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    顧客姓名: formData.name,
                    電話: formData.phone,
                    電子信箱: formData.email,
                    喜好風格: formData.style,
                    生日: formData.birthday,
                    建檔時間: today,
                    密碼: formData.password
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert("註冊成功！");
                navigate("/login");
            } else {
                setError(data.message || "註冊失敗");
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
                    <h2 className="hero-title">會員註冊</h2>
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>顧客姓名</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="請輸入姓名"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>電話</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="請輸入電話"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>電子信箱</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="請輸入電子郵件"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>喜好風格</label>
                            <input
                                type="text"
                                name="style"
                                value={formData.style}
                                onChange={handleChange}
                                placeholder="例如：浪漫、簡約、復古"
                            />
                        </div>
                        <div className="form-group">
                            <label>生日</label>
                            <input
                                type="date"
                                name="birthday"
                                value={formData.birthday}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>密碼</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="請輸入密碼"
                                required
                            />
                        </div>
                        <button type="submit" className="add-button">註冊</button>
                    </form>

                    {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
                </section>
            </main>


        </div>
    );
}
