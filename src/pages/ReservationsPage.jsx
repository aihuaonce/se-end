import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/zh-cn'; // 確保中文語言包已引入
import { PlusCircle } from 'lucide-react'; // <<--- 新增：引入圖標

moment.locale('zh-cn'); // 設置 moment 全局語言為中文

const API_BASE_URL = 'http://localhost:5713';

function AdminReservationsPage() {
    const [filters, setFilters] = useState({
        customer_name: '',
        reservation_type: '',
        status: '',
        start_date: '',
        end_date: ''
    });
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // <<--- 新增：用於控制新增預約模態框的狀態 (假設) ---
    const [showAddReservationModal, setShowAddReservationModal] = useState(false);
    // --- 新增結束 --- >

    const handleSearch = useCallback(async (showLoading = true) => {
        if(showLoading) setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_BASE_URL}/api/reserve`, { params: filters });
            if (Array.isArray(res.data)) {
                setReservations(res.data);
            } else {
                console.warn("API 返回的預約數據不是一個數組:", res.data);
                setReservations([]);
                setError("獲取預約數據格式不正確。");
            }
        } catch (err) {
            console.error('查詢預約失敗：', err);
            setReservations([]);
            setError(err.response?.data?.message || '查詢預約失敗，請稍後再試。');
        } finally {
            if(showLoading) setLoading(false);
        }
    }, [filters]);

    const handleUpdateStatus = async (reservationId, newStatus) => {
        if (!reservationId || !newStatus) return;
        const originalReservations = [...reservations];
        setReservations(prev => prev.map(r => r.reservation_id === reservationId ? {...r, status: newStatus} : r));
        try {
            const response = await axios.put(`${API_BASE_URL}/api/reserve/${reservationId}/status`, { status: newStatus });
            if (!response.data.success) {
                throw new Error(response.data.message || "狀態更新失敗於伺服器。");
            }
            if (response.data.data) {
                 setReservations(prev => prev.map(r => r.reservation_id === reservationId ? response.data.data : r));
            }
            alert("預約狀態更新成功！");
            // 可以考慮在成功後重新獲取列表，確保數據一致性，尤其如果後端有其他邏輯
            // handleSearch(false); // 傳 false 避免重複的 loading 效果
        } catch (err) {
            console.error('狀態更新失敗：', err);
            alert(`狀態更新失敗: ${err.message || '請稍後再試。'}`);
            setReservations(originalReservations);
        }
    };

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ customer_name: '', reservation_type: '', status: '', start_date: '', end_date: '' });
        // 清除篩選後，通常會立即重新搜尋
        // handleSearch(); // 如果希望清除後立即刷新，取消此行註釋
    };

    const statusOptions = [
        { value: "", label: "全部狀態" },
        { value: "pending", label: "待確認" },
        { value: "confirmed", label: "已確認" },
        { value: "completed", label: "已完成" },
        { value: "cancelled", label: "已取消" },
    ];

    // <<--- 新增：處理新增預約按鈕點擊的函數 (假設) ---
    const handleOpenAddReservationModal = () => {
        setShowAddReservationModal(true);
        // 在這裡您可以添加打開模態框或導航到新頁面的邏輯
        console.log("新增預約按鈕被點擊，應打開模態框或跳轉。");
    };

    const handleCloseAddReservationModal = () => { // 假設的關閉模態框函數
        setShowAddReservationModal(false);
    }
    // --- 新增結束 --- >

    return (
        <div className="p-6 md:p-8 font-sans bg-pink-50 min-h-screen">
            <style>{`
                /* ... (CSS 樣式保持不變) ... */
                .custom-input { border: 1px solid #e5a8b5; padding: 10px 12px; border-radius: 8px; transition: border-color 0.2s, box-shadow 0.2s; background-color: white; }
                .custom-input:focus { outline: none; border-color: #cb8a90; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
                .filter-button { padding: 10px 20px; background-color: #ec4899; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .filter-button:hover { background-color: #db2777; }
                .filter-button.clear { background-color: #d1d5db; color: #374151; }
                .filter-button.clear:hover { background-color: #9ca3af; }
                h1.page-title { font-size: 2rem; font-weight: 700; color: #db2777; text-align: center; letter-spacing: 0.025em; } /* 移除 margin-bottom */
                .page-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 1.5rem; } /* 新增容器來包裹標題和按鈕 */
                @media (min-width: 768px) { /* md breakpoint */
                    .page-header { flex-direction: row; justify-content: space-between; }
                    h1.page-title { text-align: left; }
                }
                .table-container { overflow-x: auto; background-color: white; border-radius: 12px; box-shadow: 0 6px 12px rgba(0,0,0,0.08); }
                thead th { background-color: #fce7f3; color: #be185d; padding: 12px 10px; text-align:center; }
                tbody td { padding: 12px 10px; border-color: #fde8f1; text-align:center; }
                tbody tr:hover { background-color: #fff0f5; }
                .status-select { padding: 6px 10px; border-radius: 6px; border: 1px solid #fbcfe8; background-color: white; min-width: 140px; font-size: 0.875rem; }
                .add-button { display: flex; align-items: center; background-color: #ec4899; color: white; font-weight: 500; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: background-color 0.2s; }
                .add-button:hover { background-color: #db2777; }
            `}</style>

            {/* <<--- 修改：將標題和新增按鈕包裹起來以便佈局 --- */}
            <div className="page-header">
                <h1 className="page-title">預約管理系統</h1>
                <button
                    onClick={handleOpenAddReservationModal}
                    className="filter-button mt-4 md:mt-0 mt-5"
                >
                    新增預約
                </button>
            </div>
            {/* --- 修改結束 --- > */}


            <div className="bg-white p-5 mb-6 shadow-lg rounded-xl">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">篩選條件</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col">
                        <label htmlFor="filterCustomerName" className="text-sm font-medium text-gray-600 mb-1">顧客姓名</label>
                        <input id="filterCustomerName" name="customer_name" className="custom-input" placeholder="輸入姓名..." value={filters.customer_name} onChange={handleFilterChange} />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="filterReservationType" className="text-sm font-medium text-gray-600 mb-1">預約類型</label>
                        <input id="filterReservationType" name="reservation_type" className="custom-input" placeholder="輸入類型..." value={filters.reservation_type} onChange={handleFilterChange} />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="filterStatus" className="text-sm font-medium text-gray-600 mb-1">狀態</label>
                        <select id="filterStatus" name="status" className="custom-input" value={filters.status} onChange={handleFilterChange}>
                            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="filterStartDate" className="text-sm font-medium text-gray-600 mb-1">開始日期</label>
                        <input id="filterStartDate" name="start_date" className="custom-input" type="date" value={filters.start_date} onChange={handleFilterChange} />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="filterEndDate" className="text-sm font-medium text-gray-600 mb-1">結束日期</label>
                        <input id="filterEndDate" name="end_date" className="custom-input" type="date" value={filters.end_date} onChange={handleFilterChange} />
                    </div>
                </div>
                <div className="flex justify-center gap-3 mt-5">
                    <button className="filter-button" onClick={() => handleSearch(true)} disabled={loading}>
                        {loading ? '查詢中...' : '應用篩選'}
                    </button>
                    <button className="filter-button clear" onClick={clearFilters} disabled={loading}>
                        清除條件
                    </button>
                </div>
            </div>
            
            {error && <p className="text-center text-red-500 mb-4 bg-red-100 p-3 rounded-md shadow">{error}</p>}

            <div className="table-container">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="px-3 py-2 text-center">預約ID</th>
                            <th className="px-3 py-2 text-center">顧客姓名</th>
                            <th className="px-3 py-2 text-center">預約類型</th>
                            <th className="px-3 py-2 text-center">預約時間</th>
                            <th className="px-3 py-2 text-center">狀態</th>
                            <th className="px-3 py-2 text-center">備註</th>
                            <th className="px-3 py-2 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && reservations.length === 0 ? (
                            <tr><td colSpan="7" className="text-center py-10 text-gray-500">正在載入預約記錄...</td></tr>
                        ) : reservations.length > 0 ? (
                            reservations.map((item) => (
                                <tr key={item.reservation_id} className="hover:bg-gray-50">
                                    <td className="border-t px-3 py-2 text-center">{item.reservation_id}</td>
                                    <td className="border-t px-3 py-2 text-center">{item.customer_name || <span className="italic text-gray-400">未知顧客</span>}</td>
                                    <td className="border-t px-3 py-2 text-center">{item.reservation_type}</td>
                                    <td className="border-t px-3 py-2 text-center whitespace-nowrap">{item.reservation_time ? moment(item.reservation_time).format('YYYY/MM/DD HH:mm') : 'N/A'}</td>
                                    <td className="border-t px-3 py-2 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            item.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                            item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700' // pending
                                        }`}>
                                            {statusOptions.find(opt => opt.value === item.status)?.label || item.status}
                                        </span>
                                    </td>
                                    <td className="border-t px-3 py-2 max-w-xs truncate text-center" title={item.notes}>{item.notes || '-'}</td>
                                    <td className="border-t px-3 py-2 text-center">
                                        {item.status !== 'completed' && item.status !== 'cancelled' && (
                                             <select
                                                className="status-select text-xs"
                                                value="" 
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleUpdateStatus(item.reservation_id, e.target.value);
                                                    }
                                                }}
                                            >
                                                <option value="" disabled>更改狀態...</option>
                                                {item.status === 'pending' && <option value="confirmed">確認此預約</option>}
                                                {(item.status === 'pending' || item.status === 'confirmed') && <option value="completed">標記為已完成</option>}
                                                {(item.status === 'pending' || item.status === 'confirmed') && <option value="cancelled">取消此預約</option>}
                                            </select>
                                        )}
                                        {(item.status === 'completed' || item.status === 'cancelled') && (
                                            <span className="text-gray-400 text-xs italic">{statusOptions.find(opt => opt.value === item.status)?.label || item.status}</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-10 text-gray-500">
                                    {error ? error : '沒有符合條件的預約記錄，或尚未有任何預約。'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* <<--- 新增：顯示新增預約模態框 (如果 showAddReservationModal 為 true) --- */}
            {showAddReservationModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-2xl font-semibold mb-6 text-pink-700">新增預約</h2>
                        <p className="mb-4 text-gray-700">哈哈沒東西</p>
                        <p className="mb-6 text-sm text-gray-500">
                            (好的答答答)
                        </p>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleCloseAddReservationModal}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- 新增結束 --- > */}
        </div>
    );
}

export default AdminReservationsPage;