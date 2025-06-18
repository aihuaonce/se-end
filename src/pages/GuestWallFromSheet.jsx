// frontend/src/pages/GuestWallFromSheet.jsx

import React, { useState, useEffect } from 'react';

// 後端 API 的 URL
const API_BASE_URL = 'http://localhost:5713/api'; // 請確保這裡的埠號與您的 backend/server.js 中的 PORT 一致

function GuestWallFromSheet() {
    const [guests, setGuests] = useState([]);
    const [selectedGuests, setSelectedGuests] = useState(new Set()); // 用於儲存選中的賓客索引
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 定義表格的列配置
    // 這些鍵值應與後端從 Google Sheet 讀取後產生的物件鍵名一致
    const columns = [
        { key: 'name', label: '姓名', width: 'w-1/6' },
        { key: 'relation', label: '與新人的關係', width: 'w-1/6' },
        { key: 'email', label: 'Email', width: 'w-1/6' },
        { key: 'blessing_style_selection', label: '祝福風格選擇', width: 'w-1/6' }, // <-- 新增欄位顯示
        { key: 'blessing_suggestion', label: '若想自己寫', width: 'w-1/5' }, // <-- 調整標籤以匹配 Google Sheet 中的 '若想自己寫，請輸入祝福語'
        // 移除了 audio_consent 和 avatar_consent，因為它們不在 Google Sheet 的實際表頭中
        { key: 'status', label: '狀態', width: 'w-[120px]' }, // 確保 Google Sheet 有此欄位
        { key: 'blessing', label: '生成的祝福語', width: 'w-1/4' }, // 確保 Google Sheet 有此欄位
        { key: 'video_url', label: '影片連結', width: 'w-1/4', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">查看影片</a> : '無' }, // 確保 Google Sheet 有此欄位
        { key: 'photo_url', label: '照片連結', width: 'w-1/4', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">查看照片</a> : '無' },
        { key: '_rowIndex', label: '索引', width: 'w-[60px]' }, // 顯示內部索引
    ];

    // 從後端獲取賓客數據
    const fetchGuests = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/guests`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setGuests(data);
            setMessage('賓客數據載入成功。');
        } catch (err) {
            console.error("載入賓客數據失敗:", err);
            setError(`載入賓客數據失敗: ${err.message}. 請確認後端伺服器是否運行。`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuests(); // 元件掛載時載入賓客數據
    }, []);

    // 處理賓客選擇
    const handleSelectGuest = (index) => {
        setSelectedGuests(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(index)) {
                newSelected.delete(index);
            } else {
                newSelected.add(index);
            }
            return newSelected;
        });
    };

    // 處理全選/全不選
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allIndexes = new Set(guests.map(guest => guest._rowIndex));
            setSelectedGuests(allIndexes);
        } else {
            setSelectedGuests(new Set());
        }
    };

    // 通用處理生成請求的函數
    const handleGenerate = async (endpoint, actionName) => {
        if (selectedGuests.size === 0) {
            setError(`請選擇至少一位賓客來 ${actionName}。`);
            return;
        }

        setLoading(true);
        setError('');
        setMessage(`正在為 ${selectedGuests.size} 位賓客 ${actionName}...`);

        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guestIndexes: Array.from(selectedGuests) }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // 由於後端可能會返回錯誤訊息，這裡應該檢查 result.success
            if (result.success) {
                setMessage(`${actionName} 請求成功。`);
            } else {
                setError(`${actionName} 請求部分或全部失敗: ${result.message || '未知錯誤'}. 請檢查後端日誌。`);
            }
            
            setSelectedGuests(new Set()); // 清空選取
            fetchGuests(); // 重新載入數據以顯示最新狀態
        } catch (err) {
            console.error(`${actionName} 失敗:`, err);
            setError(`${actionName} 失敗: ${err.message}. 請檢查後端日誌。`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 p-8 font-inter"> 
            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
                <header className="bg-teal-600 text-white p-6 text-center rounded-t-xl"> 
                    <h1 className="text-4xl font-bold mb-2">AI 賓客分身管理</h1>
                    <p className="text-lg">選擇賓客以生成祝福語或 AI 影片</p>
                </header>

                <main className="p-8">
                    <div className="mb-6 flex flex-wrap gap-4 items-center">
                        <button
                            onClick={fetchGuests}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50" 
                            disabled={loading}
                        >
                            {loading ? '載入中...' : '重新載入賓客數據'}
                        </button>
                        <button
                            onClick={() => handleGenerate('generateBlessing', '生成祝福語')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50" 
                            disabled={loading || selectedGuests.size === 0}
                        >
                            {loading && message.includes('生成祝福語') ? '處理中...' : `生成祝福語 (${selectedGuests.size})`}
                        </button>
                        <button
                            onClick={() => handleGenerate('generateAvatar', '生成 AI 影片')}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50" 
                            disabled={loading || selectedGuests.size === 0}
                        >
                            {loading && message.includes('生成 AI 影片') ? '處理中...' : `生成 AI 影片 (${selectedGuests.size})`}
                        </button>
                    </div>

                    {message && <div className="bg-blue-100 text-blue-700 p-4 rounded-lg mb-6 shadow-sm">{message}</div>}
                    {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 shadow-sm">錯誤: {error}</div>}

                    <div className="overflow-x-auto rounded-lg shadow-lg">
                        <table className="min-w-full bg-white border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600 w-[40px] rounded-tl-lg">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedGuests.size === guests.length && guests.length > 0}
                                            disabled={guests.length === 0}
                                            className="rounded text-teal-600 focus:ring-teal-500" 
                                        />
                                    </th>
                                    {columns.map(col => (
                                        <th key={col.key} className={`p-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600 ${col.width}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="p-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600 rounded-tr-lg w-[120px]">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {guests.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={columns.length + 2} className="p-6 text-center text-gray-500">
                                            沒有賓客數據。請確認 Google Sheet 是否有資料，並檢查後端連線。
                                        </td>
                                    </tr>
                                ) : (
                                    guests.map(guest => (
                                        <tr key={guest._rowIndex} className="hover:bg-gray-50 border-b border-gray-100">
                                            <td className="p-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGuests.has(guest._rowIndex)}
                                                    onChange={() => handleSelectGuest(guest._rowIndex)}
                                                    className="rounded text-teal-600 focus:ring-teal-500" 
                                                />
                                            </td>
                                            {columns.map(col => (
                                                <td key={col.key} className="p-4 text-sm text-gray-800 whitespace-pre-wrap">
                                                    {col.render ? col.render(guest[col.key]) : guest[col.key]}
                                                </td>
                                            ))}
                                            <td className="p-4 whitespace-nowrap text-sm">
                                                {/* 單獨操作按鈕 - 生成祝福語 */}
                                                <button
                                                    onClick={() => handleGenerate('generateBlessing', '生成祝福語', [guest._rowIndex])} // 傳遞單個賓客索引
                                                    className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium mr-2 mb-1 opacity-75 hover:opacity-100" 
                                                    disabled={loading} // 僅禁用全局 loading 狀態，不禁用單獨選中的按鈕
                                                >
                                                    祝福
                                                </button>
                                                {/* 單獨操作按鈕 - 生成 AI 影片 */}
                                                <button
                                                    onClick={() => handleGenerate('generateAvatar', '生成 AI 影片', [guest._rowIndex])} // 傳遞單個賓客索引
                                                    className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium opacity-75 hover:opacity-100" 
                                                    disabled={loading} // 僅禁用全局 loading 狀態，不禁用單獨選中的按鈕
                                                >
                                                    影片
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}

// 匯出 GuestWallFromSheet 元件
export default GuestWallFromSheet;
