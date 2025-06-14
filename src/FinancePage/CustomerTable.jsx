import React from 'react';

export default function CustomerTable({ customers, onCustomerClick }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">客戶管理</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">客戶編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">聯絡人</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">電話</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">Email</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length > 0 ? (
              customers.map(c => (
                <tr key={c.customer_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.customer_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.name}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.contact_person}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.phone}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.email}</td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => onCustomerClick(c)}
                      className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-indigo-600 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">沒有客戶數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}