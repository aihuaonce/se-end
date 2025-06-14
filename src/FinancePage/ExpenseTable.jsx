import React from 'react';

export default function ExpenseTable({ expenses, onAddExpenseClick }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-[#C9C2B2]">支出管理</h3>
        <button
          onClick={onAddExpenseClick}
          className="px-6 py-2 bg-[#C9C2B2] text-white font-semibold rounded-full shadow-md hover:bg-[#B7B09F] transition duration-300 ease-in-out transform hover:scale-105"
        >
          新增支出
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">支出編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">供應商</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">分類</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">支出項目</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">廠商發票號碼</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length > 0 ? (
              expenses.map(e => (
                <tr key={e.expense_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.expense_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.project_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.vendor_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.category_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.description}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {e.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.expense_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.responsible_person || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.vendor_invoice_number || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="p-4 text-center text-gray-500">沒有支出數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}