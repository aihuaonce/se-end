import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import validator from 'validator';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiMenu } from 'react-icons/fi';

// 後端 API 的基礎 URL
const API_BASE_URL = 'http://localhost:5713';

function ServicePageContent() {
    const [allCustomers, setAllCustomers] = useState([]); // 從後端獲取的原始數據 (現在實際上是專案數據)
    const [filteredAndSearchedCustomers, setFilteredAndSearchedCustomers] = useState([]); // 經過篩選/搜尋後的數據
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        groom_name: "",
        bride_name: "",
        email: "",
        phone: "",
        wedding_date: "", // 這裡儲存的是 datetime-local 的字串 (YYYY-MM-DDTHH:mm)
        wedding_location: "", // 對應後端的 wedding_place
        form_link: "", // 對應後端的 google_sheet_link
    });
    const [formErrors, setFormErrors] = useState({}); // 使用物件來存儲多個欄位的錯誤
    const [isSubmitting, setIsSubmitting] = useState(false); // 追蹤是否正在提交表單
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'closed'
    const [isMenuOpen, setIsMenuOpen] = useState(false); // 控制漢堡選單開合
    const [notification, setNotification] = useState(null); // 提示訊息狀態

    // ==== 搜尋相關的狀態 ====
    const [searchQuery, setSearchQuery] = useState(''); // 儲存搜尋框的輸入值
    const [searchBy, setSearchBy] = useState('name'); // 儲存搜尋欄位，預設為 'name'

    // ==== 分頁相關的狀態 ====
    const [currentPage, setCurrentPage] = useState(1); // 當前頁碼，預設第一頁
    const [itemsPerPage] = useState(7); // 每頁顯示的項目數，預設 7 個

    // 獲取客戶資料的函式 (只負責從後端獲取資料並設定 allCustomers)
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        let url = `${API_BASE_URL}/customers`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "未知錯誤" }));
                throw new Error(errorData.message || `API 請求失敗 ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            setAllCustomers(data);
            setLoading(false);
            setCurrentPage(1); // 重新獲取資料時，重設回第一頁
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("無法載入客戶資料，請稍後再試：" + err.message);
            setAllCustomers([]);
            setFilteredAndSearchedCustomers([]); // 出錯時清空顯示列表
            setLoading(false);
        }
    }, []);

    // ==== 前端篩選和搜尋客戶資料的函式 ====
    const filterAndSearchCustomers = useCallback(() => {
        let result = allCustomers;

        // 先根據 filterStatus 篩選
        if (filterStatus !== 'all') {
            result = result.filter(customer => customer.status === filterStatus);
        }

        // 再根據 searchQuery 搜尋
        if (searchQuery.trim()) {
            const lowerCaseQuery = searchQuery.trim().toLowerCase();
            result = result.filter(customer => {
                switch (searchBy) {
                    case 'name':
                        return (customer.groom_name && String(customer.groom_name).toLowerCase().includes(lowerCaseQuery)) ||
                               (customer.bride_name && String(customer.bride_name).toLowerCase().includes(lowerCaseQuery));
                    case 'email':
                        return customer.email && String(customer.email).toLowerCase().includes(lowerCaseQuery);
                    case 'wedding_date':
                        if (customer.wedding_date) {
                            try {
                                // 將 datetime-local 字串轉換為 YYYY-MM-DD 進行比較
                                const formattedDate = new Date(customer.wedding_date).toISOString().split('T')[0];
                                return formattedDate.includes(searchQuery.trim());
                            } catch (e) {
                                console.warn("日期格式化錯誤或無效日期", customer.wedding_date, e);
                                return false;
                            }
                        }
                        return false;
                    default:
                        return false;
                }
            });
        }
        setFilteredAndSearchedCustomers(result);
        setCurrentPage(1); // 當篩選或搜尋條件改變時，重設回第一頁
    }, [allCustomers, filterStatus, searchQuery, searchBy]);

    // 初次載入時獲取客戶資料
    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // 當 allCustomers, filterStatus, searchQuery 或 searchBy 改變時，重新篩選和搜尋
    useEffect(() => {
        filterAndSearchCustomers();
    }, [allCustomers, filterStatus, searchQuery, searchBy, filterAndSearchCustomers]);

    // 計算當前頁面要顯示的客戶資料
    const customersToDisplay = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSearchedCustomers.slice(startIndex, endIndex);
    }, [filteredAndSearchedCustomers, currentPage, itemsPerPage]);

    // 計算總頁數
    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSearchedCustomers.length / itemsPerPage);
    }, [filteredAndSearchedCustomers, itemsPerPage]);

    // 使用 useEffect 來自動隱藏提示訊息
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000); // 3 秒後隱藏提示訊息
            return () => clearTimeout(timer); // 在 notification 改變或元件卸載時清除 timer
        }
    }, [notification]);

    // 表單驗證函式 (新增客戶)
    const validateForm = () => {
        const errors = {};

        // 驗證新郎新娘姓名
        if (!formData.groom_name || !formData.groom_name.trim()) errors.groom_name = "請填寫新郎姓名";
        if (!formData.bride_name || !formData.bride_name.trim()) errors.bride_name = "請填寫新娘姓名";

        // 驗證 Email
        if (!formData.email || !formData.email.trim()) {
            errors.email = "請填寫電子郵件地址";
        } else if (!validator.isEmail(formData.email)) {
            errors.email = "請輸入有效的電子郵件地址";
        }

        // 驗證電話
        if (!formData.phone || !formData.phone.trim()) {
            errors.phone = "請填寫聯絡電話";
        } else if (!validator.isMobilePhone(formData.phone, 'any', { strictMode: false })) {
            errors.phone = "請輸入有效的聯絡電話";
        }

        // 婚禮日期非必填，但如果填了，格式要正確 (datetime-local 格式)
        if (formData.wedding_date) {
            const dateObj = new Date(formData.wedding_date);
            if (isNaN(dateObj.getTime())) { // 檢查是否是有效的日期
                errors.wedding_date = "請選擇有效的婚禮日期和時間";
            }
        }

        // Google 試算表連結必填且格式正確
        if (!formData.form_link || !formData.form_link.trim()) {
            errors.form_link = "請填寫 Google 試算表連結";
        } else if (!validator.isURL(formData.form_link, { require_protocol: true })) {
            errors.form_link = "請輸入有效的連結 (包含 http:// 或 https://)";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // 當使用者修改欄位時，清除該欄位的錯誤訊息
        if (formErrors[e.target.name]) {
            setFormErrors({ ...formErrors, [e.target.name]: "" });
        }
        // 清除提交錯誤訊息
        if (formErrors.submit) {
            setFormErrors({ ...formErrors, submit: "" });
        }
    };

    // 處理新增客戶表單提交
    const handleSubmit = async () => {
        if (!validateForm()) {
            return; // 驗證失敗，停止提交
        }
        setIsSubmitting(true);
        setFormErrors({});

        try {
            const res = await fetch(`${API_BASE_URL}/customers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMessage = data.message || `新增失敗，請稍後再試 (${res.status})`;
                console.error("新增客戶 API 錯誤:", errorMessage);
                throw new Error(errorMessage);
            }

            fetchCustomers(); // 重新載入列表數據
            setShowForm(false); // 關閉表單 Modal
            setFormData({ // 重設表單數據
                groom_name: "", bride_name: "", email: "", phone: "",
                wedding_date: "", wedding_location: "", form_link: "",
            });
            setFormErrors({}); // 清空表單錯誤
            setNotification({ message: "客戶新增成功！", type: "success" });
        } catch (err) {
            console.error("新增錯誤：", err);
            setFormErrors({ ...formErrors, submit: err.message || "新增失敗，請稍後再試" });
            setNotification({ message: err.message || "新增失敗，請稍後再試", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 拖曳開始處理 ---
    const onDragStart = (start) => {
        console.log("Drag started for:", start.draggableId);
        if (searchQuery) {
            console.log("Drag cancelled: Cannot drag while searching.");
            setNotification({ message: "搜尋結果中無法拖曳。", type: "info" });
            return false; // 阻止拖曳
        }
    };

    // --- 拖曳結束處理 ---
    const onDragEnd = async (result) => {
        const { destination, draggableId } = result;
        const allowedDropZones = ['open', 'closed'];

        if (!destination || !allowedDropZones.includes(destination.droppableId)) {
            console.log("Drag cancelled: Invalid drop destination.");
            return;
        }

        if (searchQuery) {
            console.log("Drag cancelled: Cannot drag while searching (onDragEnd).");
            return;
        }

        const projectId = parseInt(draggableId.split('-')[1]);
        const targetStatus = destination.droppableId;
        const draggedCustomer = allCustomers.find(c => c.id === projectId);

        if (!draggedCustomer || draggedCustomer.status === targetStatus) {
            console.log("Drag cancelled: Customer not found or status unchanged.");
            if (draggedCustomer && draggedCustomer.status === targetStatus) {
                setNotification({ message: `客戶狀態已是 ${targetStatus === 'open' ? '未結案' : '已結案'}`, type: "info" });
            }
            return;
        }

        const customerIndexInAll = allCustomers.findIndex(c => c.id === projectId);
        if (customerIndexInAll === -1) {
            console.error("Attempted to drag a customer not found in allCustomers.");
            return;
        }

        // 在 API 呼叫前樂觀更新 UI 狀態
        const originalAllCustomers = [...allCustomers];
        const newAllCustomers = Array.from(allCustomers);
        newAllCustomers[customerIndexInAll] = { ...newAllCustomers[customerIndexInAll], status: targetStatus };
        setAllCustomers(newAllCustomers);

        try {
            const updateRes = await fetch(`${API_BASE_URL}/customers/${projectId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: targetStatus }),
            });

            let updateData;
            try {
                updateData = await updateRes.json();
            } catch (jsonErr) {
                console.warn("無法解析狀態更新響應為 JSON:", jsonErr);
                updateData = { message: await updateRes.text().catch(() => "未知響應") };
            }

            if (!updateRes.ok) {
                const errorMessage = updateData.message || `更新客戶 ${projectId} 狀態失敗 (${updateRes.status})`;
                throw new Error(errorMessage);
            }

            console.log(`客戶 ${projectId} 狀態更新為 ${targetStatus} 成功`);
            setNotification({ message: `客戶 ${draggedCustomer.groom_name} 的狀態已更新為 ${targetStatus === 'open' ? '未結案' : '已結案'}`, type: "success" });

        } catch (err) {
            console.error("更新客戶狀態錯誤:", err);
            setNotification({ message: "更新客戶狀態失敗：" + err.message, type: "error" });
            setAllCustomers(originalAllCustomers); // 還原 UI
        }
    };

    // 根據 status 取得對應的背景色
    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-yellow-100 hover:bg-yellow-200'; // 未結案
            case 'closed': return 'bg-green-100 hover:bg-green-200'; // 已結案
            default: return 'hover:bg-slate-100'; // 未知狀態或 all 篩選時
        }
    };

    // 處理篩選變更
    const handleFilterChange = (newStatus) => {
        setFilterStatus(newStatus);
        setIsMenuOpen(false);
        setSearchQuery(''); // 清空搜尋框
        setSearchBy('name'); // 重設搜尋欄位
    };

    // ==== 處理搜尋輸入框變化 ====
    const handleSearchInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // ==== 處理搜尋欄位選擇變化 ====
    const handleSearchByChange = (e) => {
        setSearchBy(e.target.value);
    };

    // ==== 處理點擊搜尋按鈕或按下 Enter 鍵 (非必要，因為 filterAndSearchCustomers 會自動運行) ====
    const handleSearch = () => {
        console.log("執行前端搜尋...");
    };

    // ==== 處理 Enter 鍵盤事件 (在搜尋輸入框中) ====
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // ==== 分頁控制函式 ====
    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // --- 自訂拖曳預覽函式 ---
    const renderCustomerDragClone = (provided, snapshot, draggable) => {
        const projectId = parseInt(draggable.draggableId.split('-')[1]);
        const customer = allCustomers.find(c => c.id === projectId);

        if (!customer) return null;

        const combinedStyle = {
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging ? '#bae6fd' : 'white',
            padding: '0.5rem 1rem',
            border: '1px solid #0284c7',
            borderRadius: '0.375rem',
            width: 'auto',
            minWidth: 'auto',
            maxWidth: '300px',
            boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
            textAlign: 'center',
            position: provided.draggableProps.style.position,
            top: provided.draggableProps.style.top,
            left: provided.draggableProps.style.left,
            transform: provided.draggableProps.style.transform,
            transition: 'none',
            zIndex: 5000,
            boxSizing: 'content-box',
        };

        return (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={combinedStyle}
                className="text-slate-700 text-sm md:text-base font-semibold"
            >
                {customer.groom_name} & {customer.bride_name}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-600 text-xl">載入中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-full">
                <p className="text-red-600 text-xl">{error}</p>
            </div>
        );
    }

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd} renderClone={renderCustomerDragClone}>
            <div className="flex flex-col w-full h-full overflow-hidden">
                {notification && (
                    <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
                        {notification.message}
                    </div>
                )}
                <div className="w-full max-w-screen-xl mx-auto flex flex-col md:flex-row py-4 px-2 flex-grow overflow-hidden">
                    <div className={`w-full md:w-3/4 bg-white shadow-lg rounded-lg p-6 md:p-8 mb-4 md:mb-0 md:mr-4 flex flex-col overflow-x-auto`}>
                        <div className="flex-grow">
                            <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-700 text-2xl p-2">
                                    <FiMenu />
                                </button>
                                <h1 className="text-xl md:text-3xl font-semibold text-slate-700 mx-auto text-center">
                                    自動化賀卡寄送 {searchQuery ? ` (搜尋: "${searchQuery}")` : ` (${filterStatus === 'all' ? '全部' : filterStatus === 'open' ? '未結案' : '已結案'})`}
                                </h1>
                                <button onClick={() => setShowForm(true)} className="bg-sky-700 text-white px-4 py-2 rounded-md shadow hover:bg-sky-800 transition-colors duration-200 text-sm md:text-base" disabled={isSubmitting}>
                                    新增客戶
                                </button>
                            </div>

                            {/* 篩選選單 */}
                            <div className={`fixed top-0 left-0 h-full w-64 bg-white text-black shadow-lg z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
                                <div className="p-4">
                                    <button onClick={() => setIsMenuOpen(false)} className="absolute top-2 right-2 text-slate-500 text-2xl">×</button>
                                    <h2 className="text-xl font-semibold mb-4">篩選狀態</h2>
                                    <button onClick={() => handleFilterChange('all')} className={`block w-full text-left p-2 rounded mb-2 ${filterStatus === 'all' && !searchQuery ? 'bg-sky-100' : 'hover:bg-gray-100'}`}>全部</button>
                                    <button onClick={() => handleFilterChange('open')} className={`block w-full text-left p-2 rounded mb-2 ${filterStatus === 'open' && !searchQuery ? 'bg-sky-100' : 'hover:bg-gray-100'}`}>未結案</button>
                                    <button onClick={() => handleFilterChange('closed')} className={`block w-full text-left p-2 rounded ${filterStatus === 'closed' && !searchQuery ? 'bg-sky-100' : 'hover:bg-gray-100'}`}>已結案</button>
                                </div>
                            </div>
                            {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>}

                            {/* 搜尋輸入框和篩選欄位 */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-6 items-stretch">
                                <input
                                    type="text"
                                    placeholder="輸入關鍵字搜尋 (姓名, Email, 或婚禮日期YYYY-MM-DD)"
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    onKeyPress={handleKeyPress}
                                    className="flex-grow border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm md:text-base"
                                />
                                <select
                                    value={searchBy}
                                    onChange={handleSearchByChange}
                                    className="border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 text-black text-sm md:text-base flex-shrink-0"
                                >
                                    <option value="name">姓名</option>
                                    <option value="email">電子郵件</option>
                                    <option value="wedding_date">婚禮日期</option>
                                </select>
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setSearchBy('name'); }}
                                        className="bg-slate-500 text-white px-4 py-2 rounded-md shadow hover:bg-slate-600 transition-colors duration-200 text-sm md:text-base flex-shrink-0"
                                    >
                                        清除搜尋
                                    </button>
                                )}
                                {(searchQuery || filterStatus !== 'all') && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setSearchBy('name'); setFilterStatus('all'); }}
                                        className="bg-slate-500 text-white px-4 py-2 rounded-md shadow hover:bg-slate-600 transition-colors duration-200 text-sm md:text-base flex-shrink-0"
                                    >
                                        清除所有篩選
                                    </button>
                                )}
                            </div>

                            {/* 新增客戶表單 Modal */}
                            {showForm && (
                                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
                                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
                                        <div className="flex justify-between items-center mb-4 border-b pb-2 border-slate-200">
                                            <h2 className="text-xl font-bold text-slate-700">新增客戶資訊</h2>
                                            <button
                                                onClick={() => {
                                                    setShowForm(false);
                                                    setFormErrors({});
                                                    setFormData({ groom_name: "", bride_name: "", email: "", phone: "", wedding_date: "", wedding_location: "", form_link: "" });
                                                }}
                                                className="text-slate-500 hover:text-slate-700 text-2xl"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">新郎姓名</label>
                                                <input type="text" name="groom_name" value={formData.groom_name} onChange={handleChange} placeholder="新郎姓名" className={`border ${formErrors.groom_name ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.groom_name && <p className="text-red-500 text-sm mt-1">{formErrors.groom_name}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">新娘姓名</label>
                                                <input type="text" name="bride_name" value={formData.bride_name} onChange={handleChange} placeholder="新娘姓名" className={`border ${formErrors.bride_name ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.bride_name && <p className="text-red-500 text-sm mt-1">{formErrors.bride_name}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">聯絡信箱</label>
                                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="聯絡信箱" className={`border ${formErrors.email ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話</label>
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="聯絡電話" className={`border ${formErrors.phone ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">婚禮日期時間</label>
                                                <input type="datetime-local" name="wedding_date" value={formData.wedding_date} onChange={handleChange} className={`border ${formErrors.wedding_date ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.wedding_date && <p className="text-red-500 text-sm mt-1">{formErrors.wedding_date}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">婚禮地點</label>
                                                <input type="text" name="wedding_location" value={formData.wedding_location} onChange={handleChange} placeholder="婚禮地點" className={`border ${formErrors.wedding_location ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.wedding_location && <p className="text-red-500 text-sm mt-1">{formErrors.wedding_location}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Google 試算表連結</label>
                                                <input type="text" name="form_link" value={formData.form_link} onChange={handleChange} placeholder="google 試算表連結" className={`border ${formErrors.form_link ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500`} />
                                                {formErrors.form_link && <p className="text-red-500 text-sm mt-1">{formErrors.form_link}</p>}
                                            </div>
                                        </div>
                                        {formErrors.submit && <p className="text-red-600 text-sm mt-2 text-center">{formErrors.submit}</p>}
                                        <div className="flex gap-4 mt-4 justify-end">
                                            <button onClick={handleSubmit} className="bg-sky-700 text-white px-4 py-2 rounded-md shadow hover:bg-sky-800 disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? '提交中...' : '確認新增'}</button>
                                            <button
                                                onClick={() => {
                                                    setShowForm(false);
                                                    setFormErrors({});
                                                    setFormData({ groom_name: "", bride_name: "", email: "", phone: "", wedding_date: "", wedding_location: "", form_link: "" });
                                                }}
                                                className="bg-slate-500 text-white px-4 py-2 rounded-md shadow hover:bg-slate-600 disabled:opacity-50"
                                                disabled={isSubmitting}
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 客戶列表表格 */}
                            <div className="overflow-x-auto mt-6">
                                <table className="w-full text-center border-collapse table-auto min-w-max">
                                    <thead className="bg-slate-300 text-slate-700 sticky top-0">
                                        <tr>
                                            <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">新郎</th>
                                            <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">新娘</th>
                                            <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">電子郵件</th>
                                            <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">婚禮日期</th>
                                            <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">狀態</th>
                                            <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">操作</th>
                                        </tr>
                                    </thead>
                                    <Droppable droppableId="customer-list" type="CUSTOMER">
                                        {(provided) => (
                                            <tbody {...provided.droppableProps} ref={provided.innerRef}>
                                                {customersToDisplay.map((c, index) => (
                                                    <Draggable key={c.id} draggableId={`customer-${c.id}`} index={index} isDragDisabled={!!searchQuery}>
                                                        {(provided, snapshot) => (
                                                            <tr
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`${getStatusColor(c.status)} ${snapshot.isDragging ? 'bg-sky-100 shadow-lg opacity-90' : ''}`}
                                                                style={provided.draggableProps.style}
                                                            >
                                                                <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{c.groom_name}</td>
                                                                <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{c.bride_name}</td>
                                                                <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg break-all">{c.email}</td>
                                                                <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">
                                                                    {c.wedding_date ? new Date(c.wedding_date).toISOString().split('T')[0] : '未設定'}
                                                                </td>
                                                                <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg font-semibold">
                                                                    {c.status === 'open' ? '未結案' : '已結案'}
                                                                </td>
                                                                <td className="py-3 px-4 border-b border-slate-200 text-sm md:text-lg">
                                                                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-2">
                                                                        <Link to={`/customer/${c.id}`} className="inline-block w-full sm:w-auto text-center bg-sky-600 text-white px-3 py-1 rounded hover:bg-sky-700 transition text-xs sm:text-sm">查看</Link>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </tbody>
                                        )}
                                    </Droppable>
                                </table>
                            </div>

                            {/* 無資料提示 */}
                            {filteredAndSearchedCustomers.length === 0 && !loading && (
                                <p className="text-center text-slate-500 mt-8 text-lg">
                                    {searchQuery ? `找不到符合 "${searchQuery}" 的客戶資料。` : (filterStatus === 'all' ? '目前沒有客戶資料。' : filterStatus === 'open' ? '沒有未結案的客戶資料。' : '沒有已結案的客戶資料。')}
                                </p>
                            )}

                            {/* 分頁控制 */}
                            {filteredAndSearchedCustomers.length > itemsPerPage && (
                                <div className="flex justify-center items-center mt-6 space-x-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 border rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-100 text-slate-700 text-sm md:text-base"
                                    >
                                        上一頁
                                    </button>
                                    <span className="text-slate-700 text-sm md:text-base"> 頁碼 {currentPage} / {totalPages} </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 border rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-100 text-slate-700 text-sm md:text-base"
                                    >
                                        下一頁
                                    </button>
                                    <span className="text-slate-500 text-sm md:text-base ml-4"> ({filteredAndSearchedCustomers.length} 筆資料) </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 右側拖曳目標區域 */}
                    <div className="w-full md:w-56 flex-shrink-0 flex flex-col space-y-4">
                        {/* 已結案 Droppable 區 */}
                        <Droppable droppableId="closed" type="CUSTOMER" isDropDisabled={!!searchQuery}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 bg-white shadow-lg rounded-lg p-4 min-h-[150px] md:min-h-[200px] border-2 border-dashed transition-colors duration-200 flex flex-col justify-center items-center text-center non-table-droppable ${snapshot.isDraggingOver ? 'border-green-500 bg-green-50' : 'border-gray-300'} ${searchQuery ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <h2 className="text-lg md:text-xl font-semibold text-center text-slate-700 mb-2">已結案區</h2>
                                    {searchQuery ? (
                                        <p className="text-xs md:text-sm text-center text-gray-500">搜尋時無法拖曳</p>
                                    ) : (
                                        <p className="text-xs md:text-sm text-center text-gray-500">拖曳至此標記為已結案</p>
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {/* 未結案 Droppable 區 */}
                        <Droppable droppableId="open" type="CUSTOMER" isDropDisabled={!!searchQuery}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 bg-white shadow-lg rounded-lg p-4 min-h-[150px] md:min-h-[200px] border-2 border-dashed transition-colors duration-200 flex flex-col justify-center items-center text-center non-table-droppable ${snapshot.isDraggingOver ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'} ${searchQuery ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <h2 className="text-lg md:text-xl font-semibold text-slate-700 mb-2">未結案區</h2>
                                    {searchQuery ? (
                                        <p className="text-xs md:text-sm text-center text-gray-500">搜尋時無法拖曳</p>
                                    ) : (
                                        <p className="text-xs md:text-sm text-center text-gray-500">拖曳至此標記為未結案</p>
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>
            </div>
        </DragDropContext>
    );
}

export default ServicePageContent;