import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Briefcase } from 'lucide-react';

// 引入假資料
import { MOCK_VENDORS } from '../data/mockVendors'; // <-- 這裡引入假資料

// 引入廠商詳情彈窗組件
import VendorDetailModal from './vendor-recommendation/modals/VendorDetailModal';

// 模擬 API URL，實際應用中這應該是你的後端地址 (如果你有真實 API，可以移除 MOCK_VENDORS)
const API_URL = 'http://localhost:5713';

export default function VendorRecommendationPage() {
    const [allVendors, setAllVendors] = useState([]);
    const [filteredVendors, setFilteredVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);

    // 從引入的假數據中提取所有獨特的類別
    const allCategories = useMemo(() => {
        // 這裡仍然使用 MOCK_VENDORS 來獲取類別，確保在沒有真實數據時能正常工作
        const categories = new Set(MOCK_VENDORS.map(vendor => vendor.category));
        return ['all', ...Array.from(categories)].sort();
    }, []);

    // 模擬數據加載 (未來這裡會替換為真實的 axios.get 請求)
    useEffect(() => {
        setLoading(true);
        setError(null);
        // 模擬 API 延遲
        setTimeout(() => {
            setAllVendors(MOCK_VENDORS); // <-- 從引入的假資料中設置數據
            setLoading(false);
        }, 500);
    }, []);

    // 篩選和搜尋邏輯
    useEffect(() => {
        let result = allVendors;

        if (filterCategory !== 'all') {
            result = result.filter(vendor => vendor.category === filterCategory);
        }

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
        <div className="bg-white flex flex-col w-full">
            <h3 className="text-3xl font-bold mb-6 text-pink-700 flex items-center gap-2">
                <Briefcase size={28} />
                廠商推薦
            </h3>

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

            {showDetailModal && selectedVendor && (
                <VendorDetailModal
                    vendorData={selectedVendor}
                    onClose={handleCloseDetailModal}
                />
            )}
        </div>
    );
}