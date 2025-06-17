import React from 'react';

export default function ExpenseTable({ expenses, onAddExpenseClick }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-[#C9C2B2]">支出管理</h3>
        <button
          onClick={onAddExpenseClick}
          // Updated button style to match FinancePage (1).jsx theme
          className="px-6 py-3 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-lg text-lg font-semibold"
        >
          新增支出
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">支出ID</th> {/* Changed from 編號 to ID */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th> {/* Changed from 專案 to 專案名稱 */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">供應商</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">分類</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">描述</th> {/* Changed from 支出項目 to 描述 */}
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th> {/* Changed from 日期 to 支出日期 */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">付款方式</th> {/* Added this column */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">會計科目</th> {/* Added this column */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">廠商發票號碼</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length > 0 ? (
              expenses.map(exp => (
                <tr key={exp.expense_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.expense_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.project_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.vendor_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.category_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.description}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {exp.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.expense_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.payment_method}</td> {/* Display new column */}
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.accounting_account_name}</td> {/* Display new column */}
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.responsible_person || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.vendor_invoice_number || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="p-4 text-center text-gray-500">沒有支出數據。</td> {/* Updated colspan */}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}