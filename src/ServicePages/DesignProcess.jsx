import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import validator from 'validator';
import { FiMenu } from 'react-icons/fi';
// 確保 Service.css 已經被清理過，不再包含全局或衝突樣式
import '../styles/Service.css'; 
import moment from 'moment';

// 引入 CustomMonthPickerCalendar
import CustomMonthPickerCalendar from '../components/CustomMonthPickerCalendar';

// 建議將這個函數名改為 DesignProcessContent
function DesignProcessContent() { // 將函數名從 App 改為 DesignProcessContent
  const [allCustomers, setAllCustomers] = useState([]);
  const [filteredAndSearchedCustomers, setFilteredAndSearchedCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    groom_name: "",
    bride_name: "",
    email: "",
    phone: "",
    wedding_date: "",
    wedding_location: "",
    form_link: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [notification, setNotification] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('name');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);

  // ==== 日曆相關的狀態 ====
  const [selectedDate, setSelectedDate] = useState(null);

  const minAllowedDate = useMemo(() => new Date(1990, 0, 1), []);
  const maxAllowedDate = useMemo(() => new Date(new Date().getFullYear(), 11, 31), []);

  const allWeddingEvents = useMemo(() => {
    return allCustomers
      .filter(customer => customer.wedding_date)
      .map(customer => ({
        date: moment(customer.wedding_date).startOf('day').toDate(),
        status: customer.status
      }));
  }, [allCustomers]);


  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    let url = "http://localhost:5713/customers";
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "未知錯誤" }));
        throw new Error(errorData.message || "API request failed: " + res.statusText);
      }
      const data = await res.json();
      setAllCustomers(data);
      setLoading(false);
      setCurrentPage(1);

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("無法載入客戶資料，請稍後再試：" + err.message);
      setAllCustomers([]);
      setFilteredAndSearchedCustomers([]);
      setLoading(false);
    }
  }, []);

  const filterAndSearchCustomers = useCallback(() => {
    let result = allCustomers;

    if (filterStatus !== 'all') {
      result = result.filter(customer => customer.status === filterStatus);
    }

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
              const formattedDate = moment(customer.wedding_date).format('YYYY-MM-DD');
              return formattedDate.includes(searchQuery.trim());
            }
            return false;
          default:
            return false;
        }
      });
    }

    if (selectedDate) {
      const selectedMonthYear = moment(selectedDate).format('YYYY-MM');
      result = result.filter(customer =>
        customer.wedding_date && moment(customer.wedding_date).format('YYYY-MM') === selectedMonthYear
      );
    }

    setFilteredAndSearchedCustomers(result);

  }, [allCustomers, filterStatus, searchQuery, searchBy, selectedDate]);


  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    filterAndSearchCustomers();
    setCurrentPage(1);
  }, [allCustomers, filterStatus, searchQuery, searchBy, selectedDate, filterAndSearchCustomers]);


  const customersToDisplay = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSearchedCustomers.slice(startIndex, endIndex);
  }, [filteredAndSearchedCustomers, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSearchedCustomers.length / itemsPerPage);
  }, [filteredAndSearchedCustomers, itemsPerPage]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const validateForm = () => {
    const errors = {};
    if (!formData.groom_name.trim()) errors.groom_name = "請填寫新人姓名";
    if (!formData.bride_name.trim()) errors.bride_name = "請填寫新人姓名";
    if (!formData.email.trim()) {
      errors.email = "請填寫電子郵件地址";
    } else if (!validator.isEmail(formData.email)) {
      errors.email = "請輸入有效的電子郵件地址";
    }
    if (!formData.phone.trim()) errors.phone = "請填寫聯絡電話";
    if (!formData.form_link.trim()) {
      errors.form_link = "請填寫 Google 試算表連結";
    } else if (!validator.isURL(formData.form_link, { require_protocol: true })) {
      errors.form_link = "請輸入有效的連結 (包含 http:// 或 https://)";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: "" });
    }
    if (formErrors.submit) {
      setFormErrors({ ...formErrors, submit: "" });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const res = await fetch("http://localhost:5713/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || "新增失敗，請稍後再試";
        console.error("新增客戶 API 錯誤:", errorMessage);
        throw new Error(errorMessage);
      }

      fetchCustomers();

      setShowForm(false);
      setFormData({
        groom_name: "",
        bride_name: "",
        email: "",
        phone: "",
        wedding_date: "",
        wedding_location: "",
        form_link: "",
      });
      setNotification({ message: "客戶新增成功！", type: "success" });

    } catch (err) {
      console.error("新增錯誤：", err);
      setFormErrors({ ...formErrors, submit: err.message || "新增失敗，請稍後再試" });
      setNotification({ message: err.message || "新增失敗，請稍後再試", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 hover:bg-yellow-200';
      case 'closed': return 'bg-green-100 hover:bg-green-200';
      default: return 'hover:bg-slate-100';
    }
  };

  const handleFilterChange = (newStatus) => {
    setFilterStatus(newStatus);
    setIsMenuOpen(false);
    setSearchQuery('');
    setSearchBy('name');
    setSelectedDate(null);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchByChange = (e) => {
    setSearchBy(e.target.value);
  };

  const handleSearch = () => {
    console.log("執行前端搜尋...");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleMonthSelect = (date) => {
    setSelectedDate(date);
    setFilterStatus('all');
    setSearchQuery('');
    setSearchBy('name');
  };

  const handleClearCalendarFilter = useCallback(() => {
    setSelectedDate(null);
  }, []);


  if (loading) {
    return (
      // 修正：bg-gray-200 改為 bg-white，min-h-screen 移除
      <div className="flex justify-center items-center h-full bg-white">
        <p className="text-gray-600 text-xl">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      // 修正：bg-gray-200 改為 bg-white，min-h-screen 移除
      <div className="flex justify-center items-center h-full bg-white">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full"> 

      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}
      <div className="w-full max-w-screen-xl mx-auto flex flex-col md:flex-row flex-grow overflow-x-hidden"> 

        <div className={`w-full md:w-3/4 bg-white shadow-lg rounded-lg p-6 md:p-8 mb-4 md:mb-0 md:mr-4 flex flex-col flex-grow`}> 
          <div className="flex-grow"> 
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-700 text-2xl p-2">
                <FiMenu />
              </button>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-700 md:ml-0 mx-auto text-center">
                AI流程設計
                {searchQuery ? ` (搜尋: "${searchQuery}")` :
                  selectedDate ? ` (篩選月份: ${moment(selectedDate).format('YYYY年M月')})` :
                    ` (${filterStatus === 'all' ? '全部' : filterStatus === 'open' ? '未結案' : '已結案'})`}
              </h1>
              <button
                onClick={() => setShowForm(true)}
                className="bg-sky-700 text-white px-4 py-2 rounded-md shadow hover:bg-sky-800 transition-colors duration-200 text-sm md:text-base"
                disabled={isSubmitting}
              >
                新增客戶
              </button>
            </div>

            <div className={`fixed top-0 left-0 h-full w-64 bg-white text-black shadow-lg z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
              <div className="p-4">
                <button onClick={() => setIsMenuOpen(false)} className="absolute top-2 right-2 text-slate-500 text-2xl">×</button>
                <h2 className="text-xl font-semibold mb-4">篩選</h2>
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

            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
                  <div className="flex justify-between items-center mb-4 border-b pb-2 border-slate-200">
                    <h2 className="text-xl font-bold text-slate-700">新增客戶資訊</h2>
                    <button onClick={() => { setShowForm(false); setFormErrors({}); setFormData({ groom_name: "", bride_name: "", email: "", phone: "", wedding_date: "", wedding_location: "", form_link: "" }); }} className="text-slate-500 hover:text-slate-700 text-2xl">×</button>
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
                    <button onClick={() => { setShowForm(false); setFormErrors({}); setFormData({ groom_name: "", bride_name: "", email: "", phone: "", wedding_date: "", wedding_location: "", form_link: "" }); }} className="bg-slate-500 text-white px-4 py-2 rounded-md shadow hover:bg-slate-600 disabled:opacity-50" disabled={isSubmitting}>取消</button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-center border-collapse table-auto">
                <thead className="bg-slate-300 text-slate-700">
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
                  {customersToDisplay.map((c, index) => (
                    <tr
                      key={c.id}
                      className={`${getStatusColor(c.status)}`}
                    >
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{c.groom_name}</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{c.bride_name}</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg break-all">{c.email}</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">
                        {c.wedding_date ? moment(c.wedding_date).format('YYYY-MM-DD') : '未設定'}
                      </td>
                      <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">
                        {c.status === 'open' ? '未結案' : '已結案'}
                      </td>
                      <td className="py-3 px-4 border-b border-slate-200 text-sm md:text-lg">
                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <Link to={`/customer/${c.id}`} className="inline-block w-full sm:w-auto text-center bg-sky-600 text-white px-3 py-1 rounded hover:bg-sky-700 transition text-xs sm:text-sm">查看</Link>
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
          <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-sm md:max-w-none"> 
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
export default DesignProcessContent; // 確保名稱與 App.jsx 匹配