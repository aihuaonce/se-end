import React from 'react';

export default function PaymentTable({ payments }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">付款紀錄</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">付款ID</th> {/* Changed from 付款編號 to 付款ID */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">客戶名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">對應發票</th> {/* Added this column */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th> {/* Changed from 付款日期 to 日期 */}
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">狀態</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length > 0 ? (
              payments.map(p => (
                <tr key={p.payment_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.payment_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.customer_name}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.invoice_id || 'N/A'}</td> {/* Added data for new column */}
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.project_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.payment_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {p.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.method}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${p.status === '已付款' ? 'bg-green-100 text-green-800' : // Consistent with FinancePage (1).jsx for "已付款"
                        p.status === '處理中' ? 'bg-blue-100 text-blue-800' : // Added "處理中" status as seen in FinancePage (1).jsx
                        'bg-red-100 text-red-800' // Default for other statuses
                      }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">沒有付款數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}