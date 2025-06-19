import React, { useEffect, useState, useMemo } from 'react'; // 引入 useMemo
import axios from 'axios';

// 後端 API 的基礎 URL
const API_BASE_URL = 'http://localhost:5713'; // 請根據您的後端服務地址修改

function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true); // 添加 loading 狀態
  const [error, setError] = useState(null); // 添加 error 狀態


  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true); // 開始載入
    setError(null); // 清空錯誤
    try {
      // 呼叫後端 API 獲取客戶資料 (URL 保持不變)
      const res = await axios.get(`${API_BASE_URL}/api/customers`); // 使用完整的 API_BASE_URL
      setCustomers(res.data);
      setLoading(false); // 載入完成
    } catch (err) {
      console.error('取得客戶資料錯誤:', err);
      setError("無法載入客戶資料，請稍後再試。"); // 設定錯誤訊息
      setCustomers([]); // 清空數據
      setLoading(false); // 載入完成 (帶有錯誤)
    }
  };

  // 使用 useMemo 記憶過濾後的結果，避免在 searchKeyword 或 customers 不變時重複計算
  const filteredCustomers = useMemo(() => {
      if (!customers || !Array.isArray(customers)) {
          return []; // 確保 customers 是有效的陣列
      }
      if (!searchKeyword) {
          return customers; // 如果沒有搜尋關鍵字，返回所有客戶
      }
      const lowerCaseKeyword = searchKeyword.toLowerCase();
       // 過濾客戶數據，使用新的英文欄位名稱 name, phone, email
      return customers.filter((c) => {
          const customerString = `${c.name || ''}${c.phone || ''}${c.email || ''}`; // 組合欄位值，處理可能為 null/undefined 的情況
          return customerString.toLowerCase().includes(lowerCaseKeyword);
      });
  }, [customers, searchKeyword]); // 依賴 customers 數據和 searchKeyword


  // 根據 loading 和 error 狀態顯示不同的 UI
  if (loading) {
      return (
          <div className="p-6 max-w-4xl mx-auto text-center">
              <p className="text-gray-600 text-xl">載入中...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="p-6 max-w-4xl mx-auto text-center">
              <p className="text-red-600 text-xl">錯誤：{error}</p>
          </div>
      );
  }


  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-lg rounded-lg"> 
      <style>{`
        /* 可以保留表格的基本樣式 */
        .customer-table {
          width: 100%;
          border-collapse: collapse;
           /* border: 1px solid white; /* 這行可能不需要如果使用 Tailwind border classes */
          font-family: sans-serif;
        }

        .customer-table th {
          background-color: #cb8a90; /* 您原來的顏色 */
          color: white;
          padding: 12px;
          text-align: left;
           /* border: 1px solid white; */
        }

        .customer-table td {
          padding: 12px;
           /* border: 1px solid white; */
          background-color: #fff7f8; /* 您原來的顏色 */
          color: #333;
           word-break: break-all; /* 避免長信箱或電話超出邊界 */
        }

        .customer-table tr:hover td {
          background-color: #fdecef; /* 您原來的 hover 顏色 */
        }

        /* input 樣式可以使用 Tailwind class */
        /* .custom-input { ... } */

      `}</style>

      <input
        type="text"
        placeholder="搜尋姓名、電話或信箱..."
        className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800" // 使用 Tailwind class
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
      />

      <table className="customer-table w-full text-left border border-gray-200 rounded-md overflow-hidden"> 
        <thead className="bg-pink-700 text-white"> 
          <tr>
             {/* 使用 Tailwind padding/border/text/font classes */}
            <th className="py-3 px-4 border-b border-white text-sm font-semibold">客戶ID</th> 
            <th className="py-3 px-4 border-b border-white text-sm font-semibold">姓名</th> 
            <th className="py-3 px-4 border-b border-white text-sm font-semibold">電話</th> 
            <th className="py-3 px-4 border-b border-white text-sm font-semibold">電子信箱</th> 
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((cust) => (
             /* 使用新的英文欄位名稱作為 key */
            <tr key={cust.customer_id} className="hover:bg-gray-100"> {/* 使用 Tailwind hover class */}
              <td className="py-3 px-4 border-b border-gray-200 text-gray-800 text-sm">{cust.customer_id}</td> 
              <td className="py-3 px-4 border-b border-gray-200 text-gray-800 text-sm">{cust.name}</td>
              <td className="py-3 px-4 border-b border-gray-200 text-gray-800 text-sm">{cust.phone}</td>
              <td className="py-3 px-4 border-b border-gray-200 text-gray-800 text-sm">{cust.email}</td>
            </tr>
          ))}
          {filteredCustomers.length === 0 && !loading && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                    {searchKeyword ? `找不到符合 "${searchKeyword}" 的客戶。` : '目前沒有客戶資料。'}
                </td>
              </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerPage;