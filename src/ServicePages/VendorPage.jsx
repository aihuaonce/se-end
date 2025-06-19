import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';

import VendorDetailModal from './modals/VendorDetailModal';

const API_URL = 'http://localhost:5713'; // 確保與後端伺服器端口一致

export default function VendorPage() {
  const [allVendors, setAllVendors] = useState([]); // 從後端獲取的原始數據
  const [filteredAndSearchedVendors, setFilteredAndSearchedVendors] = useState([]); // 經過篩選/搜尋後的數據
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('name');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [availableCategories, setAvailableCategories] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // 移除 selectedDate 相關狀態
  // const [selectedDate, setSelectedDate] = useState(null);

  // 獲取所有獨特類別 (從後端獲取)
  const allCategories = useMemo(() => {
    return ['all', ...availableCategories].sort();
  }, [availableCategories]);


  // ==== 數據獲取函式 ====
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 構建查詢參數
      const params = new URLSearchParams();
      if (filterCategory !== 'all') {
        params.append('category', filterCategory);
      }
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }

      // 呼叫後端 API
      const response = await axios.get(`${API_URL}/api/vendors?${params.toString()}`);

      // 數據庫返回的 ID 可能是 vendor_id，前端需要轉換為 id
      const formattedVendors = response.data.map(vendor => ({
        ...vendor,
        id: vendor.vendor_id // 確保前端的 id 屬性存在
      }));

      setAllVendors(formattedVendors); // 設定從後端獲取的所有廠商
      setFilteredAndSearchedVendors(formattedVendors); // 初始時，篩選後的數據就是所有數據
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('無法載入廠商資料，請稍後再試。');
      setAllVendors([]);
      setFilteredAndSearchedVendors([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, searchQuery]); // 依賴篩選類別和搜尋查詢，當這些變化時重新獲取數據

  // 獲取類別列表
  const fetchCategories = useCallback(async () => {
    try {
      // 假設後端有一個 /api/vendor-categories 接口來獲取所有類別
      const response = await axios.get(`${API_URL}/api/vendors/categories`); // 修改為 /api/vendors/categories
      setAvailableCategories(response.data);
    } catch (err) {
      console.error('Error fetching vendor categories:', err);
      // 即使獲取失敗，也不影響主要數據
    }
  }, []);

  // 組件載入時，先獲取類別，然後獲取廠商數據
  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, [fetchCategories, fetchVendors]); // 依賴這些獲取函式

  const filterAndSearchVendors = useCallback(() => {
    let result = allVendors;

    if (filterCategory !== 'all') {
      result = result.filter(vendor => vendor.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const lowerCaseQuery = searchQuery.trim().toLowerCase();
      result = result.filter(vendor => {
        switch (searchBy) {
          case 'name':
            return (vendor.name && String(vendor.name).toLowerCase().includes(lowerCaseQuery));
          case 'contact_person':
            return vendor.contact_person && String(vendor.contact_person).toLowerCase().includes(lowerCaseQuery);
          default:
            return false;
        }
      });
    }


    setFilteredAndSearchedVendors(result);

  }, [allVendors, filterCategory, searchQuery, searchBy]); // 移除 selectedDate 依賴

  useEffect(() => {
    filterAndSearchVendors();
    setCurrentPage(1);
  }, [allVendors, filterCategory, searchQuery, searchBy, filterAndSearchVendors]); // 移除 selectedDate 依賴

  const vendorsToDisplay = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSearchedVendors.slice(startIndex, endIndex);
  }, [filteredAndSearchedVendors, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSearchedVendors.length / itemsPerPage);
  }, [filteredAndSearchedVendors, itemsPerPage]);


  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchByChange = (e) => {
    setSearchBy(e.target.value);
  };

  const handleFilterCategoryChange = (e) => {
    setFilterCategory(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
  };

  const handleViewDetail = (vendor) => {
    setSelectedVendor(vendor);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedVendor(null);
    setShowDetailModal(false);
  };

  const getStatusColor = () => {
      return 'hover:bg-slate-100';
  };


  const handlePageChange = (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
          setCurrentPage(pageNumber);
      }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-white">
        <p className="text-gray-600 text-xl">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full bg-white">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
          <div className="w-full max-w-screen-xl mx-auto flex flex-col md:flex-row flex-grow overflow-x-hidden">
              <div className={`w-full md:w-3/4 bg-white shadow-lg rounded-lg p-6 md:p-8 mb-4 md:mb-0 md:mr-4 flex flex-col flex-grow`}>
                  <div className="flex-grow">
                      <div className="flex justify-between items-center mb-8">
                          <h1 className="text-2xl md:text-3xl font-semibold text-slate-700 md:ml-0 mx-auto text-center">
                              廠商推薦
                              {searchQuery ? ` (搜尋: "${searchQuery}")` :
                                  /* 移除日期篩選相關文字 */
                                  ` (${filterCategory === 'all' ? '全部' : filterCategory})`}
                          </h1>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 mb-6 items-stretch">
                          <input
                              type="text"
                              placeholder="輸入關鍵字搜尋 (廠商名稱 或 聯絡人)"
                              value={searchQuery}
                              onChange={handleSearchInputChange}
                              className="flex-grow border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm md:text-base"
                          />
                          <select
                              value={searchBy}
                              onChange={handleSearchByChange}
                              className="border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 text-black text-sm md:text-base flex-shrink-0"
                          >
                              <option value="name">廠商名稱</option>
                              <option value="contact_person">聯絡人</option>
                          </select>
                          <select
                              value={filterCategory}
                              onChange={handleFilterCategoryChange}
                              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800 text-sm md:text-base flex-shrink-0"
                          >
                              {allCategories.map(category => (
                                  <option key={category} value={category}>
                                      {category === 'all' ? '所有類別' : category}
                                  </option>
                              ))}
                          </select>
                          {(searchQuery || filterCategory !== 'all' /* 移除 selectedDate 相關條件 */) && (
                              <button
                                  onClick={() => {
                                      setSearchQuery('');
                                      setFilterCategory('all');
                                      // 移除 selectedDate 相關設定
                                      //setSelectedDate(null);
                                  }}
                                  className="bg-slate-500 text-white px-4 py-2 rounded-md shadow hover:bg-slate-600 transition-colors duration-200 text-sm md:text-base flex-shrink-0"
                              >
                                  清除所有篩選
                              </button>
                          )}
                      </div>
                      <div className="overflow-x-auto mt-6">
                          <table className="w-full text-center border-collapse table-auto">
                              <thead className="bg-pink-700 text-white">
                                  <tr>
                                      <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">廠商名稱</th>
                                      <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">類別</th>
                                      <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">聯絡人</th>
                                      <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">聯絡電話</th>
                                      <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">評分</th>
                                      <th className="py-3 px-4 border-b border-slate-400 text-sm md:text-lg font-semibold">操作</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {vendorsToDisplay.map((vendor, index) => (
                                      <tr
                                          key={vendor.id}
                                          className={`${getStatusColor()}`}
                                      >
                                          <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{vendor.name}</td>
                                          <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{vendor.category}</td>
                                          <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{vendor.contact_person}</td>
                                          <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{vendor.phone}</td>
                                          <td className="py-3 px-4 border-b border-slate-200 text-black text-sm md:text-lg">{vendor.rating} / 5</td>
                                          <td className="py-3 px-4 border-b border-slate-200 text-sm md:text-lg">
                                              <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-2">
                                                  <button
                                                      onClick={() => handleViewDetail(vendor)}
                                                      className="inline-block w-full sm:w-auto text-center bg-pink-500 text-white px-3 py-1 rounded hover:bg-pink-600 transition text-xs sm:text-sm"
                                                  >
                                                      查看詳情
                                                  </button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
                  {filteredAndSearchedVendors.length === 0 && !loading && (
                      <p className="text-center text-slate-500 mt-8 text-lg">
                          {searchQuery ? `找不到符合 "${searchQuery}" 的廠商資料。` :
                              /* 移除日期篩選相關文字 */
                                  '目前沒有廠商資料。'}
                      </p>
                  )}
                  {filteredAndSearchedVendors.length > itemsPerPage && (
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
                              ({filteredAndSearchedVendors.length} 筆資料)
                          </span>
                      </div>
                  )}
              </div>
          </div>
          {showDetailModal && selectedVendor && (
              <VendorDetailModal
                  vendorData={selectedVendor}
                  onClose={handleCloseDetailModal}
              />
          )}
      </div>
  );
}