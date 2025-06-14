import React from 'react';

export default function CustomerDetailModal({ customerData, onClose }) {
  const { customer, invoices, payments } = customerData;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">客戶詳情: {customer.name}</h2>

        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xl font-semibold mb-3 text-gray-700">基本資訊</h4>
          <p><strong>客戶編號:</strong> {customer.customer_id}</p>
          <p><strong>聯絡人:</strong> {customer.contact_person}</p>
          <p><strong>電話:</strong> {customer.phone}</p>
          <p><strong>Email:</strong> {customer.email}</p>
        </div>

        <div className="mb-8 max-h-80 overflow-y-auto">
          <h4 className="text-xl font-semibold mb-3 text-gray-700">相關發票</h4>
          {invoices.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#C9C2B2] text-white">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">發票號碼</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">總金額</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">已付金額</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">尚未支付</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">開立日期</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">繳款截止日</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">分期數 (已付/預計)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount_paid?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {(inv.amount - inv.amount_paid)?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${inv.paid === '已付' ? 'bg-green-100 text-green-800' :
                            (inv.paid === '未付' || inv.paid === '逾期' || inv.paid === '部分付款' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                          {inv.paid}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.payments_count || 0} / {inv.total_installments || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有相關發票。</p>
          )}
        </div>

        <div className="mb-8 max-h-80 overflow-y-auto">
          <h4 className="text-xl font-semibold mb-3 text-gray-700">付款記錄</h4>
          {payments.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#C9C2B2] text-white">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">付款ID</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">付款日期</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">相關發票ID</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">專案</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map(pay => (
                    <tr key={pay.payment_id} className="hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.payment_id}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.payment_date}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {pay.amount?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.method}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pay.status === '已付款' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.invoice_id || 'N/A'}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.project_name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有付款記錄。</p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition duration-300 ease-in-out"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}