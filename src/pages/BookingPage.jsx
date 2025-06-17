import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import "../styles/booking.css";

const ReservePage = () => {
    const navigate = useNavigate();
    const 顧客id = parseInt(localStorage.getItem("userId"), 10); // ✅ 加 parseInt 確保是整數

    const [預約類型, set預約類型] = useState('');
    const [預約日期, set預約日期] = useState('');
    const [預約時間, set預約時間] = useState('');
    const [狀態, set狀態] = useState('待確認');

    // ✅ 加入：如果沒登入就導回登入頁
    useEffect(() => {
        const idFromStorage = localStorage.getItem("userId");
        if (!顧客id) {
            alert('請先登入才能使用預約功能');
            navigate('/login'); // 跳轉回登入頁
        }
    }, [顧客id, navigate]);

    const handleReserve = async () => {
        const 預約時間完整格式 = `${預約日期} ${預約時間}:00`;

        try {
            const res = await axios.post('http://localhost:5713/reserve', {
                顧客id,
                預約類型,
                預約時間: 預約時間完整格式,
                狀態,
            });

            if (res.status === 200) {
                alert('預約成功！');
                // ✅ 成功後清空欄位
                set預約類型('');
                set預約日期('');
                set預約時間('');
                set狀態('待確認');
            } else {
                alert('預約失敗。');
            }
        } catch (error) {
            console.error(error);
            alert('伺服器錯誤', error.response?.data || error.message);
            alert('伺服器錯誤');
        }
    };

    return (
        <div className="reserve-container">
            <div className="reserve-card">
                <h2 className="reserve-title">預約表單</h2>
                <label className="reserve-label">
                    預約類型：
                    <input
                        className="reserve-input"
                        type="text"
                        value={預約類型}
                        onChange={(e) => set預約類型(e.target.value)}
                    />
                </label>
                <label className="reserve-label">
                    預約日期：
                    <input
                        className="reserve-input"
                        type="date"
                        value={預約日期}
                        onChange={(e) => set預約日期(e.target.value)}
                    />
                </label>
                <label className="reserve-label">
                    預約時間：
                    <input
                        className="reserve-input"
                        type="time"
                        value={預約時間}
                        onChange={(e) => set預約時間(e.target.value)}
                    />
                </label>
                <button className="reserve-button" onClick={handleReserve}>
                    送出預約
                </button>
            </div>
        </div>
    );
};

export default ReservePage;
