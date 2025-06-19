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

  const filtered = customers.filter((c) =>
    (`${c['顧客姓名']}${c['電話']}${c['電子信箱']}`).toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <style>{`
        .custom-input {
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 6px;
          width: 100%;
          transition: border-color 0.2s;
        }

        .custom-input:focus {
          outline: none;
          border-color: #cb8a90;
          box-shadow: 0 0 0 2px rgba(203, 138, 144, 0.3);
        }

        .customer-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid white;
          font-family: sans-serif;
        }

        .customer-table th {
          background-color: #cb8a90;
          color: white;
          padding: 12px;
          text-align: left;
          border: 1px solid white;
        }

        .customer-table td {
          padding: 12px;
          border: 1px solid white;
          background-color: #fff7f8;
          color: #333;
        }

        .customer-table tr:hover td {
          background-color: #fdecef;
        }
      `}</style>

      <input
        type="text"
        placeholder="搜尋姓名、電話或信箱..."
        className="custom-input mb-4"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
      />

      <table className="customer-table">
        <thead>
          <tr>
            <th>顧客ID</th>
            <th>姓名</th>
            <th>電話</th>
            <th>電子信箱</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((cust) => (
            <tr key={cust['顧客id']}>
              <td>{cust['顧客id']}</td>
              <td>{cust['顧客姓名']}</td>
              <td>{cust['電話']}</td>
              <td>{cust['電子信箱']}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerPage;
