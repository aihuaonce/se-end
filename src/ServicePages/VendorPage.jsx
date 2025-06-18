import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Briefcase } from 'lucide-react'; // 引入適合廠商的圖標

// 模擬 API URL，實際應用中這應該是你的後端地址
const API_URL = 'http://localhost:5713'; 

// 模擬廠商數據 (MVP階段使用)
const MOCK_VENDORS = [
  {
    id: 'V001',
    name: '幸福時刻婚禮攝影',
    category: '攝影師',
    contactPerson: '陳小明',
    phone: '0912-345678',
    email: 'info@happyphoto.com',
    rating: 4.8,
    description: '捕捉您婚禮上每一個珍貴瞬間，風格自然溫馨。',
    priceRange: 'NT$ 20,000 - 50,000',
    website: 'https://www.happyphoto.com',
    portfolioLink: 'https://photos.google.com/happyphoto'
  },
  {
    id: 'V002',
    name: '花漾年華花藝設計',
    category: '花藝師',
    contactPerson: '林美麗',
    phone: '0933-555888',
    email: 'info@flowerage.com',
    rating: 4.7,
    description: '提供客製化婚禮花藝設計，打造夢幻氛圍。',
    priceRange: 'NT$ 15,000 - 40,000',
    website: 'https://www.flowerage.com',
    portfolioLink: 'https://instagram.com/flowerage'
  },
  {
    id: 'V003',
    name: '璀璨會館',
    category: '場地',
    contactPerson: '王經理',
    phone: '02-87654321',
    email: 'manager@brilliance.com',
    rating: 4.9,
    description: '豪華宴會廳，提供一站式婚宴服務。',
    priceRange: 'NT$ 80,000 - 200,000 (per table)',
    website: 'https://www.brilliance.com',
    portfolioLink: null
  },
  {
    id: 'V004',
    name: '糖心烘焙',
    category: '甜點',
    contactPerson: '張師傅',
    phone: '0977-111222',
    email: 'info@sweetheart.com',
    rating: 4.6,
    description: '手工製作精緻婚禮蛋糕與甜點桌。',
    priceRange: 'NT$ 8,000 - 25,000',
    website: 'https://www.sweetheart.com',
    portfolioLink: 'https://facebook.com/sweetheartbakery'
  },
  {
    id: 'V005',
    name: '幸福樂章樂團',
    category: '音樂表演',
    contactPerson: '李老師',
    phone: '0900-999000',
    email: 'info@happybeats.com',
    rating: 4.5,
    description: '專業婚禮樂團，營造浪漫溫馨氣氛。',
    priceRange: 'NT$ 25,000 - 60,000',
    website: 'https://www.happybeats.com',
    portfolioLink: 'https://youtube.com/happybeats'
  },
  {
    id: 'V006',
    name: '愛戀婚紗',
    category: '婚紗攝影',
    contactPerson: '吳小姐',
    phone: '0988-777666',
    email: 'info@lovenew.com',
    rating: 4.7,
    description: '提供多樣化婚紗款式與專業攝影服務。',
    priceRange: 'NT$ 30,000 - 80,000',
    website: 'https://www.lovenew.com',
    portfolioLink: 'https://www.lovenew.com/portfolio'
  },
  {
    id: 'V007',
    name: '雅緻新秘',
    category: '新娘秘書',
    contactPerson: '許雅琪',
    phone: '0966-333444',
    email: 'info@yazhi.com',
    rating: 4.9,
    description: '打造最適合您的獨特新娘造型。',
    priceRange: 'NT$ 18,000 - 35,000',
    website: 'https://www.yazhi.com',
    portfolioLink: 'https://www.yazhi.com/work'
  },
];


// 引入廠商詳情彈窗組件
// import VendorDetailModal from './vendor-recommendation/modals/VendorDetailModal';


export default function VendorRecommendationPage() {
  const [allVendors, setAllVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' or specific category

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // 從模擬數據中提取所有獨特的類別
  const allCategories = useMemo(() => {
    const categories = new Set(MOCK_VENDORS.map(vendor => vendor.category));
    return ['all', ...Array.from(categories)].sort(); // 'all'選項在前，其他按字母排序
  }, []);

  // 模擬數據加載
  useEffect(() => {
    setLoading(true);
    setError(null);
    // 模擬 API 延遲
    setTimeout(() => {
      setAllVendors(MOCK_VENDORS);
      setLoading(false);
    }, 500); // 模擬 0.5 秒加載
  }, []);

  // 篩選和搜尋邏輯
  useEffect(() => {
    let result = allVendors;

    // 1. 類別篩選
    if (filterCategory !== 'all') {
      result = result.filter(vendor => vendor.category === filterCategory);
    }

    // 2. 搜尋查詢
    if (searchQuery.trim()) {
      const lowerCaseQuery = searchQuery.trim().toLowerCase();
      result = result.filter(vendor =>
        vendor.name.toLowerCase().includes(lowerCaseQuery) ||
        vendor.category.toLowerCase().includes(lowerCaseQuery) ||
        vendor.contactPerson.toLowerCase().includes(lowerCaseQuery)
      );
    }

    setFilteredVendors(result);
  }, [allVendors, filterCategory, searchQuery]);


  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
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
    // 頁面根容器，讓它彈性填充 App.jsx 的 main 元素
    <div className="bg-white flex flex-col w-full"> 
      <h3 className="text-3xl font-bold mb-6 text-pink-700 flex items-center gap-2">
        <Briefcase size={28} />
        廠商推薦
      </h3>

      {/* 篩選和搜尋區域 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-stretch">
        <input
          type="text"
          placeholder="搜尋廠商名稱、類別或聯絡人..."
          value={searchQuery}
          onChange={handleSearchInputChange}
          className="flex-grow border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm md:text-base text-gray-800"
        />
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
        {(searchQuery || filterCategory !== 'all') && (
          <button
            onClick={handleClearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-md shadow hover:bg-gray-600 transition-colors duration-200 text-sm md:text-base flex-shrink-0"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* 廠商列表表格 */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-pink-700 text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">廠商名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">類別</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">聯絡人</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">聯絡電話</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">評分</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVendors.length > 0 ? (
              filteredVendors.map(vendor => (
                <tr key={vendor.id} className="hover:bg-gray-50 transition duration-150 ease-in-out text-gray-800">
                  <td className="p-3 whitespace-nowrap text-sm">{vendor.name}</td>
                  <td className="p-3 whitespace-nowrap text-sm">{vendor.category}</td>
                  <td className="p-3 whitespace-nowrap text-sm">{vendor.contactPerson}</td>
                  <td className="p-3 whitespace-nowrap text-sm">{vendor.phone}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-right">{vendor.rating} / 5</td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleViewDetail(vendor)}
                      className="px-4 py-2 bg-pink-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-pink-600 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  {searchQuery || filterCategory !== 'all' ? '沒有找到符合條件的廠商。' : '目前沒有廠商數據。'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 廠商詳情彈窗 */}
      {showDetailModal && selectedVendor && (
        <VendorDetailModal
          vendorData={selectedVendor}
          onClose={handleCloseDetailModal}
        />
      )}
    </div>
  );
}