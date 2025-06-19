import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import validator from 'validator'; // 引入 validator
import { FiMenu } from 'react-icons/fi';
// 確保 Service.css 已經被清理過，不再包含全局或衝突樣式
// import '../styles/Service.css'; 
import moment from 'moment'; // 用於日期格式化和日曆

// 引入 CustomMonthPickerCalendar
import CustomMonthPickerCalendar from '../components/CustomMonthPickerCalendar';

// 後端 API 的基礎 URL
const API_BASE_URL = 'http://localhost:5713';


// 將函數名改為 DesignProcessContent
function DesignProcessContent() { 
  const [allCustomers, setAllCustomers] = useState([]); // 從後端獲取的原始數據 (現在實際上是專案數據)
  const [filteredAndSearchedCustomers, setFilteredAndSearchedCustomers] = useState([]); // 經過篩選/搜尋後的數據
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [formErrors, setFormErrors] = useState({}); // 使用物件來存儲多個欄位的錯誤
  const [isSubmitting, setIsSubmitting] = useState(false); // 追蹤是否正在提交表單

  // 篩選狀態 (基於後端返回的舊 status: 'all', 'open', 'closed')
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 控制漢堡選單開合

  // 提示訊息狀態
  const [notification, setNotification] = useState(null);

  // ==== 搜尋相關的狀態 ====
  const [searchQuery, setSearchQuery] = useState(''); // 儲存搜尋框的輸入值
  // 搜尋欄位，對應後端 /customers 返回的字段
  const [searchBy, setSearchBy] = useState('name'); // 儲存搜尋欄位，預設為 'name' 搜尋新郎/新娘姓名

  // ==== 分頁相關的狀態 ====
  const [currentPage, setCurrentPage] = useState(1); // 當前頁碼，預設第一頁
  const [itemsPerPage] = useState(7); // 每頁顯示的項目數，預設 7 個

  // ==== 日曆相關的狀態 ====
  const [selectedDate, setSelectedDate] = useState(null); // 選定的月份（用於日曆篩選）

   // 限制日曆選擇範圍（可選）
  const minAllowedDate = useMemo(() => new Date(1990, 0, 1), []);
  const maxAllowedDate = useMemo(() => new Date(new Date().getFullYear() + 5, 11, 31), []); // 允許未來 5 年


  // 根據 allCustomers 數據計算用於日曆的婚禮事件列表
  const allWeddingEvents = useMemo(() => {
    return allCustomers
      // 確保 customer 和 wedding_date 存在且是有效的日期
      .filter(customer => customer && customer.wedding_date && moment(customer.wedding_date).isValid())
      .map(customer => ({
        // 將日期轉換為 Date 物件，並設為當天開始時間，方便日曆組件使用
        date: moment(customer.wedding_date).startOf('day').toDate(), 
        status: customer.status // 保留舊的 status 字段用於標記日曆事件顏色（如果需要）
      }));
  }, [allCustomers]);


  // 獲取客戶資料的函式 (從後端獲取專案列表)
  // 後端 /customers 路由已修改為獲取專案列表並別名欄位
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    let url = `${API_BASE_URL}/customers`; // 確保這是你的後端 API 地址
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "未知錯誤" }));
        throw new Error(errorData.message || `API 請求失敗 ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
       // 期望後端返回的數據中，每個項目包含 id (project_id), groom_name, bride_name, email, wedding_date, status (open/closed) 等別名後的字段
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
  }, []); // fetchCustomers 不依賴任何狀態，只在組件掛載時或被手動調用時執行


  // ==== 前端篩選和搜尋客戶資料的函式 ====
  // 這個函數在 allCustomers, filterStatus, searchQuery, searchBy, selectedDate 改變時運行
  const filterAndSearchCustomers = useCallback(() => {
    let result = allCustomers;

    // 1. 先根據 filterStatus 篩選 (基於後端返回的舊 status 字段)
    if (filterStatus !== 'all') {
      result = result.filter(customer => customer.status === filterStatus);
    }

    // 2. 再根據 searchQuery 搜尋
    if (searchQuery.trim()) {
      const lowerCaseQuery = searchQuery.trim().toLowerCase();
      result = result.filter(customer => {
        // 確保欄位存在且是字串，然後轉為小寫進行比較
        switch (searchBy) {
          case 'name':
             // 搜尋新郎或新娘姓名
            return (customer.groom_name && String(customer.groom_name).toLowerCase().includes(lowerCaseQuery)) ||
              (customer.bride_name && String(customer.bride_name).toLowerCase().includes(lowerCaseQuery));
          case 'email':
            return customer.email && String(customer.email).toLowerCase().includes(lowerCaseQuery);
          case 'wedding_date':
            // 檢查 customer.wedding_date 是否存在且是有效的日期格式
            if (customer.wedding_date && moment(customer.wedding_date).isValid()) {
              // 使用 moment 格式化日期為YYYY-MM-DD 進行比較
               const formattedDate = moment(customer.wedding_date).format('YYYY-MM-DD');
               // 直接比較格式化後的日期字串是否包含搜尋關鍵字
              return formattedDate.includes(searchQuery.trim());
            }
            return false; // 沒有有效的婚禮日期則不匹配
          default:
            return false;
        }
      });
    }

    // 3. 最後根據 selectedDate (月份) 篩選
    if (selectedDate) {
      const selectedMonthYear = moment(selectedDate).format('YYYY-MM');
      result = result.filter(customer =>
        // 確保 customer.wedding_date 存在且是有效的日期格式，再進行月份比較
        customer.wedding_date && moment(customer.wedding_date).isValid() && moment(customer.wedding_date).format('YYYY-MM') === selectedMonthYear
      );
    }

    // 將篩選和搜尋後的結果儲存到 filteredAndSearchedCustomers
    setFilteredAndSearchedCustomers(result);

    // 當篩選或搜尋條件改變時，重設回第一頁
    setCurrentPage(1);

  }, [allCustomers, filterStatus, searchQuery, searchBy, selectedDate]); // 依賴項包含所有可能影響結果的狀態


  // 初次載入時獲取客戶資料
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]); // 依賴項為 fetchCustomers 函式


  // 當 allCustomers, filterStatus, searchQuery 或 searchBy, selectedDate 改變時，重新篩選和搜尋
  // 合併篩選和搜尋邏輯到一個 useEffect 中，並重設分頁
  // filterAndSearchCustomers 函數內部已經包含了 setCurrentPage(1)
  useEffect(() => {
    filterAndSearchCustomers();
  }, [allCustomers, filterStatus, searchQuery, searchBy, selectedDate, filterAndSearchCustomers]);


  // 計算當前頁面要顯示的客戶資料
  const customersToDisplay = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    // 對 filteredAndSearchedCustomers 進行切片
    return filteredAndSearchedCustomers.slice(startIndex, endIndex);
  }, [filteredAndSearchedCustomers, currentPage, itemsPerPage]); // 依賴篩選搜尋結果、當前頁碼和每頁項目數

  // 計算總頁數
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSearchedCustomers.length / itemsPerPage);
  }, [filteredAndSearchedCustomers, itemsPerPage]); // 依賴篩選搜尋結果和每頁項目數

  // 使用 useEffect 來自動隱藏提示訊息
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000); // 3 秒後隱藏提示訊息

      return () => clearTimeout(timer); // 在 notification 改變或元件卸載時清除 timer
    }
  }, [notification]);

  // 根據 status 取得對應的背景色 (用於表格行)
  // 這裡使用後端返回的舊 status (open/closed)
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 hover:bg-yellow-200'; // 未結案
      case 'closed': return 'bg-green-100 hover:bg-green-200'; // 已結案
      default: return 'hover:bg-slate-100'; // 未知狀態或 all 篩選時
    }
  };

  // 處理篩選狀態變更
  const handleFilterChange = (newStatus) => {
    setFilterStatus(newStatus); // 更新篩選狀態，會觸發 filterAndSearchCustomers
    setIsMenuOpen(false); // 選擇後關閉選單
    setSearchQuery(''); // 清空搜尋框 (會觸發 filterAndSearchCustomers)
    setSearchBy('name'); // 重設搜尋欄位為 'name' (會觸發 filterAndSearchCustomers)
    setSelectedDate(null); // 清空日曆篩選 (會觸發 filterAndSearchCustomers)
     // filterAndSearchCustomers 函數內部會處理 setCurrentPage(1)
  };

  // 處理搜尋輸入框變化
  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    // filterAndSearchCustomers 會在 searchQuery 改變後自動運行，並重設分頁
  };

  // 處理搜尋欄位選擇變化
  const handleSearchByChange = (e) => {
    setSearchBy(e.target.value);
    // filterAndSearchCustomers 會在 searchBy 改變後自動運行，並重設分頁
  };

  // 處理點擊搜尋按鈕或按下 Enter 鍵 (非必要，因為 filterAndSearchCustomers 會自動運行)
  const handleSearch = () => {
    console.log("執行前端搜尋...");
    // filterAndSearchCustomers(); // 已由 useEffect 自動處理
  };

  // 處理 Enter 鍵盤事件 (在搜尋輸入框中)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(); // 觸發可能存在的額外處理 (目前沒有)
    }
  };

  // 處理分頁控制
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // 處理日曆選擇月份
  const handleMonthSelect = useCallback((date) => {
    setSelectedDate(date); // 更新選定的月份狀態，會觸發 filterAndSearchCustomers
    setFilterStatus('all'); // 選擇月份時，將狀態篩選重設為 'all' (可選的業務邏輯)
    setSearchQuery(''); // 清空搜尋框 (會觸發 filterAndSearchCustomers)
    setSearchBy('name'); // 重設搜尋欄位為 'name' (會觸發 filterAndSearchCustomers)
     // filterAndSearchCustomers 函數內部會處理 setCurrentPage(1)
  }, [setFilterStatus, setSearchQuery, setSearchBy, setSelectedDate]); // 依賴 setter 函數


  // 處理清除日曆篩選
  const handleClearCalendarFilter = useCallback(() => {
    setSelectedDate(null); // 清空選定的月份狀態，會觸發 filterAndSearchCustomers
     // filterAndSearchCustomers 函數內部會處理 setCurrentPage(1)
  }, [setSelectedDate]); // 依賴 setter 函數


  // --- 載入/錯誤時的 UI ---
  if (loading) {
    return (
      // 使用 h-full 和 bg-white，移除 min-h-screen
      <div className="flex justify-center items-center h-full bg-white">
        <p className="text-gray-600 text-xl">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      // 使用 h-full 和 bg-white，移除 min-h-screen
      <div className="flex justify-center items-center h-full bg-white">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  // --- 主要內容渲染 ---
  return (
    // 使用 flex-col w-full h-full 和 overflow-hidden 確保佈局正確
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
              <h1 className="text-xl md:text-3xl font-semibold text-slate-700 mx-auto text-center flex-grow"> 
                AI 流程設計
                {searchQuery ? ` (搜尋: "${searchQuery}")` :
                  selectedDate ? ` (篩選月份: ${moment(selectedDate).format('YYYY年M月')})` :
                    ` (${filterStatus === 'all' ? '全部' : filterStatus === 'open' ? '未結案' : '已結案'})`}
              </h1>
            </div>

            <div className={`fixed top-0 left-0 h-full w-64 bg-white text-black shadow-lg z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
              <div className="p-4">
                <button onClick={() => setIsMenuOpen(false)} className="absolute top-2 right-2 text-slate-500 text-2xl">×</button>
                <h2 className="text-xl font-semibold mb-4">篩選狀態</h2> 
                <button onClick={() => handleFilterChange('all')} className={`block w-full text-left p-2 rounded mb-2 ${(filterStatus === 'all' && !searchQuery && !selectedDate) ? 'bg-sky-100' : 'hover:bg-gray-100'}`}>全部</button>
                <button onClick={() => handleFilterChange('open')} className={`block w-full text-left p-2 rounded mb-2 ${(filterStatus === 'open' && !searchQuery && !selectedDate) ? 'bg-sky-100' : 'hover:bg-gray-100'}`}>未結案</button>
                <button onClick={() => handleFilterChange('closed')} className={`block w-full text-left p-2 rounded ${(filterStatus === 'closed' && !searchQuery && !selectedDate) ? 'bg-sky-100' : 'hover:bg-gray-100'}`}>已結案</button>
              </div>
            </div>
            {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>}

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
              {(searchQuery || selectedDate || filterStatus !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setSearchBy('name');
                            setSelectedDate(null);
                            setFilterStatus('all');
                        }}
                        className="bg-slate-500 text-white px-4 py-2 rounded-md shadow hover:bg-slate-600 transition-colors duration-200 text-sm md:text-base flex-shrink-0"
                    >
                        清除所有篩選
                    </button>
                )}
            </div>

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
                <tbody> 
                  {customersToDisplay.map((c) => (
                    <tr
                      key={c.id} // 使用 c.id (project_id) 作為 key
                      className={`${getStatusColor(c.status)}`} // 根據狀態應用背景色
                    >
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{c.groom_name}</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{c.bride_name}</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg break-all">{c.email}</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">
                        {c.wedding_date && moment(c.wedding_date).isValid() ? moment(c.wedding_date).format('YYYY-MM-DD') : '未設定'} 
                      </td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg font-semibold">
                          {c.status === 'open' ? '未結案' : '已結案'}
                      </td>
                      <td className="py-3 px-4 border-b border-slate-200 text-sm md:text-lg">
                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <Link to={`/design-process/${c.id}`} className="inline-block w-full sm:w-auto text-center bg-sky-600 text-white px-3 py-1 rounded hover:bg-sky-700 transition text-xs sm:text-sm">查看</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredAndSearchedCustomers.length === 0 && !loading && (
            <p className="text-center text-slate-500 mt-8 text-lg">
              {searchQuery ? `找不到符合 "${searchQuery}" 的客戶資料。` :
                selectedDate ? `找不到在 ${moment(selectedDate).format('YYYY年M月')} 的客戶資料。` :
                  (filterStatus === 'all' ? '目前沒有客戶資料。' : filterStatus === 'open' ? '沒有未結案的客戶資料。' : '沒有已結案的客戶資料。')}
            </p>
          )}

          {filteredAndSearchedCustomers.length > itemsPerPage && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-100 text-slate-700 text-sm md:text-base"
              >
                上一頁
              </button>
              <span className="text-slate-700 text-sm md:text-base">
                頁碼 {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-100 text-slate-700 text-sm md:text-base"
              >
                下一頁
              </button>
              <span className="text-slate-500 text-sm md:text-base ml-4">
                ({filteredAndSearchedCustomers.length} 筆資料)
              </span>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto flex-shrink-0 flex flex-col space-y-4">
          <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-sm md:max-w-none mx-auto"> 
            <h2 className="text-lg md:text-xl font-semibold text-center text-slate-700 mb-4">依婚禮月份篩選</h2>
            <CustomMonthPickerCalendar
              selectedMonth={selectedDate}
              onSelectMonth={handleMonthSelect}
              minDate={minAllowedDate}
              maxDate={maxAllowedDate}
              onClear={handleClearCalendarFilter}
              weddingEvents={allWeddingEvents}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 導出組件
export default DesignProcessContent; 