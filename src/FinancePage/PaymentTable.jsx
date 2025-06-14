import React from 'react';

export default function PaymentTable({ payments }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">付款紀錄</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider ">付款編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">客戶名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">付款日期</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">發票號碼</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">狀態</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length > 0 ? (
              payments.map(p => (
                <tr key={p.payment_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.payment_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.project_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.customer_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.payment_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {p.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.method}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.invoice_id || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === '已付款' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
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