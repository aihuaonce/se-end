import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CustomerLevelPage() {
    const [selectedLevel, setSelectedLevel] = useState('');
    const [customers, setCustomers] = useState([]);

    const levelOptions = [
        'A級(高預算、戶外)',
        'A-2級(高預算、室內)',
        'B級(正常預算、戶外)',
        'B-2級(正常預算、室內)',
        'C級(低預算、戶外)',
        'C-2級(低預算、室內)',
    ];

    const handleSearch = async () => {
        try {
            const response = await axios.get(`/api/level`, {
                params: { level: selectedLevel },
            });
            setCustomers(response.data);
        } catch (error) {
            console.error('查詢錯誤:', error);
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
                    {customers.length === 0 ? (
                        <tr>
                            <td colSpan="3" className="no-data">
                                尚無資料
                            </td>
                        </tr>
                    ) : (
                        customers.map((customer) => (
                            <tr key={customer.顧客id}>
                                <td>{customer.顧客id}</td>
                                <td>{customer.顧客姓名}</td>
                                <td>{customer.電子信箱}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default CustomerLevelPage;
