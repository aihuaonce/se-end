import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CustomerLevelPage() {
    const [selectedLevel, setSelectedLevel] = useState('');
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const API_BASE_URL = 'http://localhost:5713';

    const levelOptions = [
        'A級(高預算、戶外)',
        'A-2級(高預算、室內)',
        'B級(正常預算、戶外)',
        'B-2級(正常預算、室內)',
        'C級(低預算、戶外)',
        'C-2級(低預算、室內)',
    ];

    const handleSearch = async () => {
        if (!selectedLevel) { /* ... */ return; }
        setLoading(true); setError(''); setCustomers([]); // 查詢前清空
        try {
            const response = await axios.get(`${API_BASE_URL}/api/level`, {
                params: { level: selectedLevel },
            });
            // 非常重要：確保 response.data 是數組
            if (Array.isArray(response.data)) {
                setCustomers(response.data);
                if (response.data.length === 0) {
                    setError("沒有找到符合條件的顧客。");
                }
            } else {
                // 如果後端在某些情況下返回的不是數組（例如錯誤對象）
                console.error("API 返回的數據不是一個數組:", response.data);
                setCustomers([]); // 保持 customers 為空數組
                setError(response.data?.message || "從伺服器獲取的數據格式不正確或查詢無結果。");
            }
        } catch (error) {
            console.error('查詢錯誤:', error);
            setError(error.response?.data?.message || '查詢顧客數據時發生錯誤，請稍後再試。');
            setCustomers([]); // 出錯時確保是空數組
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 font-sans">
            <style>{`
                .title {
                    color: #cb8a90;
                }

                .select-box {
                    border: 1px solid #cb8a90;
                    border-radius: 8px;
                    padding: 8px 12px;
                    background-color: white;
                }

                .search-button {
                    background-color: #ef4c92;
                    color: white;
                    padding: 8px 16px;
                    border: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .search-button:hover {
                    background-color: #cb8a90;
                }

                .result-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 16px;
                    background-color: white;
                    border: 1px solid #f0d4d8;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .result-table th {
                    background-color: #cb8a90;
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e6bfc3;
                    color: white; /* 改這裡 */
                    border: 1px solid white;
                }
                

                .result-table td {
                    padding: 12px;
                    border: 1px solid white;
                }

                .result-table tr:hover {
                    background-color: #fff0f1;
                }

                .no-data {
                    text-align: center;
                    padding: 16px;
                    color: #888;
                }
            `}</style>

            <h1 className="text-2xl font-bold mb-4 title">顧客分級查詢</h1>

            <div className="flex items-center gap-4 mb-6">
                <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="select-box"
                >
                    <option value="">-- 請選擇分級 --</option>
                    {levelOptions.map((level, index) => (
                        <option key={index} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleSearch}
                    className="search-button"
                >
                    查詢
                </button>
            </div>

            <table className="result-table">
                <thead>
                    <tr>
                        <th>顧客ID</th>
                        <th>顧客姓名</th>
                        <th>電子信箱</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? ( // <--- 檢查此處的 'loading'
                        <tr><td colSpan="3" className="text-center py-5">查詢中...</td></tr>
                    ) : error && (!Array.isArray(customers) || customers.length === 0) ? ( // 修正：當有錯誤且顧客數據無效或為空時顯示錯誤
                        <tr><td colSpan="3" className="text-center py-5 text-red-500">{error}</td></tr>
                    ) : Array.isArray(customers) && customers.length > 0 ? (
                        customers.map((customer) => (
                            <tr key={customer.顧客id}>
                                <td className="px-4 py-3">{customer.顧客id}</td>
                                <td className="px-4 py-3">{customer.顧客姓名}</td>
                                <td className="px-4 py-3">{customer.電子信箱}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3" className="no-data">
                                {selectedLevel && !error ? "沒有找到符合條件的顧客。" : "請選擇分級並點擊查詢。"}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default CustomerLevelPage;
