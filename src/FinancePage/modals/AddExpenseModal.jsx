import React, { useState } from 'react';
import axios from 'axios';

export default function AddExpenseModal({ onClose, onExpenseAdded, categories, vendors, projects, expenseAccounts, API_URL }) {
  const [expenseData, setExpenseData] = useState({
    project_id: '',
    vendor_id: '',
    category_id: '',
    expense_item_description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_invoice_number: '',
    payment_method: '現金',
    notes: '',
    responsible_person: '',
    accounting_account_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = (value === '' || value === 'N/A (無專案)' || value === 'N/A (無供應商)' || value === 'N/A (無科目)') ? null : value;
    setExpenseData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!expenseData.expense_item_description || !expenseData.amount || !expenseData.expense_date || !expenseData.category_id || !expenseData.payment_method || !expenseData.accounting_account_id) {
        setMessage('請填寫所有標示為必填的欄位。');
        setLoading(false);
        return;
      }
      if (isNaN(parseFloat(expenseData.amount)) || parseFloat(expenseData.amount) <= 0) {
          setMessage('金額必須是有效的正數。');
          setLoading(false);
          return;
      }

      const payload = {
        ...expenseData,
        project_id: expenseData.project_id ? parseInt(expenseData.project_id) : null,
        vendor_id: expenseData.vendor_id ? parseInt(expenseData.vendor_id) : null,
        category_id: parseInt(expenseData.category_id),
        amount: parseFloat(expenseData.amount),
        accounting_account_id: parseInt(expenseData.accounting_account_id)
      };

      const res = await axios.post(`${API_URL}/api/finance/expenses`, payload);
      setMessage(res.data.message || '支出新增成功！');
      setExpenseData({
        project_id: '',
        vendor_id: '',
        category_id: '',
        expense_item_description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_invoice_number: '',
        payment_method: '現金',
        notes: '',
        responsible_person: '',
        accounting_account_id: ''
      });
      onExpenseAdded();
    } catch (err) {
      console.error('新增支出失敗:', err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.message || '新增支出失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">新增支出</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expense_item_description">
              支出項目 (描述) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="expense_item_description"
              name="expense_item_description"
              value={expenseData.expense_item_description}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
              金額 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={expenseData.amount}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="responsible_person">
              負責人 (可選)
            </label>
            <input
              type="text"
              id="responsible_person"
              name="responsible_person"
              value={expenseData.responsible_person}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expense_date">
              支出日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="expense_date"
              name="expense_date"
              value={expenseData.expense_date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category_id">
              支出分類 <span className="text-red-500">*</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              value={expenseData.category_id}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="accounting_account_id">
              會計科目 <span className="text-red-500">*</span>
            </label>
            <select
              id="accounting_account_id"
              name="accounting_account_id"
              value={expenseData.accounting_account_id}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇</option>
              {expenseAccounts.map(account => (
                <option key={account.account_id} value={account.account_id}>{account.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="project_id">
              婚禮專案 (可選)
            </label>
            <select
              id="project_id"
              name="project_id"
              value={expenseData.project_id || ''}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            >
              <option value="">N/A (無專案)</option>
              {projects.map(proj => (
                <option key={proj.project_id} value={proj.project_id}>{proj.project_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendor_id">
              供應商 (可選)
            </label>
            <select
              id="vendor_id"
              name="vendor_id"
              value={expenseData.vendor_id || ''}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            >
              <option value="">N/A (無供應商)</option>
              {vendors.map(vendor => (
                <option key={vendor.vendor_id} value={vendor.vendor_id}>{vendor.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="payment_method">
              支付方式 <span className="text-red-500">*</span>
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={expenseData.payment_method}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="現金">現金</option>
              <option value="銀行轉帳">銀行轉帳</option>
              <option value="信用卡">信用卡</option>
              <option value="支票">支票</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendor_invoice_number">
              廠商發票號碼 (可選)
            </label>
            <input
              type="text"
              id="vendor_invoice_number"
              name="vendor_invoice_number"
              value={expenseData.vendor_invoice_number}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
              備註 (可選)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={expenseData.notes}
              onChange={handleChange}
              rows="3"
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            ></textarea>
          </div>

          {message && (
            <div className="col-span-2 text-center py-2 text-sm">
              <p className={message.includes('失敗') ? 'text-red-500' : 'text-green-500'}>{message}</p>
            </div>
          )}

          <div className="col-span-2 flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition duration-300 ease-in-out"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#C9C2B2] text-white font-semibold rounded-full shadow-md hover:bg-[#B7B09F] transition duration-300 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? '提交中...' : '新增支出'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}