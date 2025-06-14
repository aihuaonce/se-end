import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import "../styles/Login.css"; // 不再需要特定的 Login.css 來處理模態框佈局

export default function RegisterModal({ onClose }) { // 接收 onClose prop
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
        setError(""); // Clear previous errors
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
                navigate("/login"); // 註冊成功後導航到登入頁面，這也會隱式關閉模態框
            } else {
                setError(data.message || "註冊失敗");
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
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform scale-100 transition-transform duration-300 overflow-y-auto max-h-[90vh]"> {/* Added max-h and overflow for long forms */}
                <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">會員註冊</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">顧客姓名 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="請輸入姓名"
                            className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">電話 <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="請輸入電話"
                            className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">電子信箱 <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="請輸入電子郵件"
                            className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="style" className="block text-gray-700 text-sm font-bold mb-2">喜好風格 (可選)</label>
                        <input
                            type="text"
                            id="style"
                            name="style"
                            value={formData.style}
                            onChange={handleChange}
                            placeholder="例如：浪漫、簡約、復古"
                            className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="birthday" className="block text-gray-700 text-sm font-bold mb-2">生日 (可選)</label>
                        <input
                            type="date"
                            id="birthday"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">密碼 <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="請輸入密碼"
                            className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full px-6 py-3 bg-[#C9C2B2] text-white rounded-full font-semibold hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
                    >
                        註冊
                    </button>
                </form>

                {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
                
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