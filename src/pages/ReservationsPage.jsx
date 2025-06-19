import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminReservationsPage() {
    const [filters, setFilters] = useState({
        顧客姓名: '',
        預約類型: '',
        狀態: '',
        開始日期: '',
        結束日期: ''
    });
    const [data, setData] = useState([]);

    const handleSearch = async () => {
        try {
            const res = await axios.get('/api/reservations', { params: filters });
            setData(res.data);
        } catch (err) {
            console.error('查詢失敗：', err);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await axios.put(`/api/reservations/${id}/status`, { 狀態: newStatus });
            handleSearch();
        } catch (err) {
            console.error('狀態更新失敗：', err);
        }
    };

    useEffect(() => {
        handleSearch();
    }, []);

    return (
        <div className="p-8 font-sans">
            <style>{`
                .custom-input {
                    border: 1px solid #ccc;
                    padding: 8px;
                    border-radius: 6px;
                    transition: border-color 0.2s;
                }

                .custom-input:focus {
                    outline: none;
                    border-color: #cb8a90;
                    box-shadow: 0 0 0 2px rgba(203, 138, 144, 0.3);
                }

                .reserve-button {
                    display: block;
                    margin-top: 1px;
                    padding: 10px 0;
                    background-color: #ef4c92;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    width: 8rem; /* ✅ 原本是 100%，改成固定寬度 */
                  }
                  
                  .reserve-button:hover {
                    background-color: #cb8a90;
                  }

                h1.page-container {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #cb8a90;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    font-size: 14px;
                    color: #333;
                }
                
                /* 表頭樣式 */
                thead {
                    background-color: #cb8a90; /* 柔和玫瑰粉 */
                    color: white;              /* 白色字體更清楚 */
                    font-weight: bold;
                }
                
                
                /* 表頭格線與字體 */
                thead th {
                    border: 1px solid #e5a8b5;
                    padding: 10px 8px;
                    text-align: center;
                }
                
                /* 表格內容列 */
                tbody td {
                    border: 1px solid #ddd;
                    padding: 10px 8px;
                    text-align: center;
                }
                
            `}</style>

            <h1 className="page-container">預約查詢</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <input
                    className="custom-input"
                    placeholder="顧客姓名"
                    onChange={e => setFilters({ ...filters, 顧客姓名: e.target.value })}
                />
                <input
                    className="custom-input"
                    placeholder="預約狀態"
                    onChange={e => setFilters({ ...filters, 狀態: e.target.value })}
                />
                <input
                    className="custom-input"
                    type="date"
                    onChange={e => setFilters({ ...filters, 開始日期: e.target.value })}
                />
                <div className="col-span-2 md:col-span-3 text-center">
                    <button className="reserve-button w-10" onClick={handleSearch}>
                        查詢
                    </button>
                </div>
            </div>

            <table className="w-full border mt-4 text-sm">
                <thead>
                    <tr>
                        <th className="border px-2 py-1">預約ID</th>
                        <th className="border px-2 py-1">顧客姓名</th>
                        <th className="border px-2 py-1">預約類型</th>
                        <th className="border px-2 py-1">預約時間</th>
                        <th className="border px-2 py-1">狀態</th>
                        <th className="border px-2 py-1">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map((item) => (
                            <tr key={item.預約id}>
                                <td className="border px-2 py-1 text-center">{item.預約id}</td>
                                <td className="border px-2 py-1">{item.顧客姓名}</td>
                                <td className="border px-2 py-1">{item.預約類型}</td>
                                <td className="border px-2 py-1">{new Date(item.預約時間).toLocaleString()}</td>
                                <td className="border px-2 py-1">{item.狀態}</td>
                                <td className="border px-2 py-1 text-center">
                                    {item.狀態 === '待確認' ? (
                                        <button
                                            style={{ color: '#cb8a90', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                                            onClick={() => updateStatus(item.預約id, '已完成')}
                                        >
                                            標記完成
                                        </button>

                                    ) : (
                                        <span className="text-gray-400">已完成</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6" className="text-center py-4 text-gray-500">沒有符合條件的資料</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default AdminReservationsPage;
