// frontend/src/pages/GuestWallFromSheet.jsx

import React, { useState, useEffect } from 'react'; // 修正了 import 語法

// 後端 API 的 URL
const API_BASE_URL = 'http://localhost:5713/api'; // 請確保這裡的埠號與您的 backend/server.js 中的 PORT 一致

function GuestWallFromSheet() {
    const [guests, setGuests] = useState([]);
    const [selectedGuests, setSelectedGuests] = useState(new Set()); // 用於儲存選中的賓客索引
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 定義表格的列配置
    // 這些鍵值應與後端從 Google Sheet 讀取後產生的物件鍵名一致 (參照 backend/AI/googleSheetsService.js 的 REQUIRED_HEADERS_CONFIG)
    const columns = [
        { key: '_rowIndex', label: '索引', width: 'w-[60px]' }, // 通常將索引放在最前面
        { key: '時間戳記', label: '時間戳記', width: 'w-[180px]' },
        { key: '姓名', label: '姓名', width: 'w-[100px]' },
        { key: '與新人的關係', label: '與新人的關係', width: 'w-[120px]' },
        { key: 'E-mail', label: 'Email', width: 'w-[180px]' }, // 修正：匹配後端鍵名
        { key: '祝福風格選擇', label: '祝福風格選擇', width: 'w-[120px]' },
        { key: '若想自己寫，請輸入祝福語', label: '自寫祝福語', width: 'w-[200px]' },
        { key: 'blessing', label: 'AI 生成祝福語', width: 'w-[200px]' },
        { key: 'status', label: '狀態', width: 'w-[100px]' },
        {
            key: 'photo_url', // 修正: 使用新的內部鍵名 'photo_url' 來獲取照片連結
            label: '清晰個人照片上傳', // 顯示的標籤可以保持與 Google Sheet 標頭一致
            width: 'w-[100px]',
            render: (val) => val ? (
                // 轉換 Google Drive 連結以便直接嵌入
                <a href={val.replace('/open?id=', '/uc?export=view&id=')} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline break-all">查看照片</a>
            ) : '無'
        },
        {
            key: '上傳語音檔', // 鍵名保持不變
            label: '語音',
            width: 'w-[100px]',
            render: (val) => val ? (
                // 轉換 Google Drive 連結以便直接嵌入
                <a href={val.replace('/open?id=', '/uc?export=view&id=')} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline break-all">聽取語音</a>
            ) : '無'
        },
        {
            key: 'AI生成影片網址', // 鍵名保持不變
            label: '影片',
            width: 'w-[100px]',
            render: (val) => val ? (
                // 轉換 Google Drive 連結以便直接嵌入
                <a href={val.replace('/open?id=', '/uc?export=view&id=')} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline break-all">查看影片</a>
            ) : '無'
        },
    ];

    // 從後端獲取賓客數據
    const fetchGuests = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            // 注意：這裡的 API_BASE_URL 後方直接跟了 /ai/guests，因為在 backend/server.js 中已經有 /api 前綴了
            const response = await fetch(`${API_BASE_URL}/ai/guests`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setGuests(data.guests); // 確保您從 data.guests 獲取陣列
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
    const handleGenerate = async (endpoint, actionName, singleGuestIndex = null) => {
        let indexesToProcess;

        if (singleGuestIndex !== null) {
            indexesToProcess = [singleGuestIndex]; // 將單個索引放入陣列中
        } else if (selectedGuests.size === 0) {
            setError(`請選擇至少一位賓客來 ${actionName}。`);
            return;
        } else {
            indexesToProcess = Array.from(selectedGuests);
        }

        // 不論是單選還是多選，總是傳送 guestIndexes 作為陣列
        const requestBody = { guestIndexes: indexesToProcess };

        setLoading(true);
        setError('');
        setMessage(`正在為 ${indexesToProcess.length} 位賓客 ${actionName}...`);

        try {
            const response = await fetch(`${API_BASE_URL}/ai/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody), // 確保傳送正確的請求體格式
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setMessage(`${actionName} 請求成功。`);
            } else {
                // 如果後端返回的不是 success: true，則可能是部分失敗或有特定訊息
                setError(`${actionName} 請求部分或全部失敗: ${result.message || '未知錯誤'}. 請檢查後端日誌。`);
            }

            setSelectedGuests(new Set()); // 清空選取
            // 延遲一段時間再重新載入數據，給予後端處理時間
            setTimeout(() => fetchGuests(), 5000);
        } catch (err) {
            console.error(`${actionName} 失敗:`, err);
            setError(`${actionName} 失敗: ${err.message}. 請檢查後端日誌。`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-8 font-inter"> {/* 淺石色到更淺石色的漸變背景 */}
            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
                <header className="bg-stone-600 text-white p-6 text-center rounded-t-xl"> {/* 較深的石色頭部 */}
                    <h1 className="text-4xl font-bold mb-2">AI 賓客分身管理</h1>
                    <p className="text-lg">選擇賓客以生成祝福語或 AI 影片</p>
                </header>

                <main className="p-8">
                    <div className="mb-6 flex flex-wrap gap-4 items-center">
                        <button
                            onClick={fetchGuests}
                            className="bg-stone-700 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50" // 更深的石色按鈕
                            disabled={loading}
                        >
                            {loading && message.includes('載入中') ? '載入中...' : '重新載入賓客數據'}
                        </button>
                        <button
                            onClick={() => handleGenerate('generate-blessings', '生成祝福語')}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50" // 溫暖的琥珀色按鈕
                            disabled={loading || selectedGuests.size === 0}
                        >
                            {loading && message.includes('生成祝福語') ? '處理中...' : `生成祝福語 (${selectedGuests.size})`}
                        </button>
                        <button
                            onClick={() => handleGenerate('generate-avatar-video', '生成 AI 影片')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50" // 柔和的翠綠色按鈕
                            disabled={loading || selectedGuests.size === 0}
                        >
                            {loading && message.includes('生成 AI 影片') ? '處理中...' : `生成 AI 影片 (${selectedGuests.size})`}
                        </button>
                    </div>

                    {message && <div className="bg-stone-100 text-stone-700 p-4 rounded-lg mb-6 shadow-sm">{message}</div>} {/* 淺石色訊息框 */}
                    {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 shadow-sm">錯誤: {error}</div>}

                    <div className="overflow-x-auto rounded-lg shadow-lg">
                        <table className="min-w-full bg-white border-collapse">
                            <thead className="bg-stone-100">
                                <tr>
                                    <th className="p-4 border-b border-gray-200 text-left text-sm font-semibold text-stone-700 w-[40px] rounded-tl-lg">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedGuests.size === guests.length && guests.length > 0}
                                            disabled={guests.length === 0}
                                            className="rounded text-stone-500 focus:ring-stone-400"
                                        />
                                    </th>
                                    {columns.map(col => (
                                        <th key={col.key} className={`p-4 border-b border-gray-200 text-left text-sm font-semibold text-stone-700 ${col.width}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="p-4 border-b border-gray-200 text-left text-sm font-semibold text-stone-700 rounded-tr-lg w-[120px]">操作</th>
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
                                        <tr key={guest._rowIndex} className="hover:bg-stone-50 border-b border-gray-100">
                                            <td className="p-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGuests.has(guest._rowIndex)}
                                                    onChange={() => handleSelectGuest(guest._rowIndex)}
                                                    className="rounded text-stone-500 focus:ring-stone-400"
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
                                                    onClick={() => handleGenerate('generate-blessings', '生成祝福語', guest._rowIndex)}
                                                    className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium mr-2 mb-1 opacity-75 hover:opacity-100"
                                                    disabled={loading}
                                                >
                                                    祝福
                                                </button>
                                                {/* 單獨操作按鈕 - 生成 AI 影片 */}
                                                <button
                                                    onClick={() => handleGenerate('generate-avatar-video', '生成 AI 影片', guest._rowIndex)}
                                                    className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium opacity-75 hover:opacity-100"
                                                    disabled={loading}
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
