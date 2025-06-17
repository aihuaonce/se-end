import React from 'react';

export default function CustomerTable({ customers, onCustomerClick }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">客戶管理</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">客戶ID</th> {/* Changed from 編號 to ID for consistency */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">公司名稱</th> {/* Changed from 名稱 to 公司名稱 for clarity */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人姓名</th> {/* Changed from 聯絡人 to 負責人姓名 for clarity */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">聯絡電話</th> {/* Changed from 電話 to 聯絡電話 */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">電子郵件</th> {/* Changed from Email to 電子郵件 */}
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
                      // Updated button style to match the theme from FinancePage (1).jsx
                      className="px-4 py-2 bg-[#8B806E] text-white text-sm font-semibold rounded-full shadow-md hover:bg-[#A99A80] transition duration-300 ease-in-out"
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