import React, { useEffect, useState } from 'react';
import axios from 'axios';

function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch (error) {
      console.error('取得顧客資料錯誤:', error);
    }
  };

  // 根據姓名、電話、信箱關鍵字過濾
  const filtered = customers.filter((c) =>
    (`${c['顧客姓名']}${c['電話']}${c['電子信箱']}`).toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">


      <input
        type="text"
        placeholder="搜尋姓名、電話或信箱..."
        className="border p-2 rounded w-full mb-4"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
      />

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">顧客ID</th>
            <th className="border px-4 py-2">姓名</th>
            <th className="border px-4 py-2">電話</th>
            <th className="border px-4 py-2">電子信箱</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((cust) => (
            <tr key={cust['顧客id']}>
              <td className="border px-4 py-2">{cust['顧客id']}</td>
              <td className="border px-4 py-2">{cust['顧客姓名']}</td>
              <td className="border px-4 py-2">{cust['電話']}</td>
              <td className="border px-4 py-2">{cust['電子信箱']}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerPage;
