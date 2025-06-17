import React, { useState } from 'react';
import axios from 'axios';

export default function AddExpenseModal({ onClose, onExpenseAdded, categories, vendors, projects, expenseAccounts, API_URL }) {
  const [formData, setFormData] = useState({
    project_id: '',
    vendor_id: '',
    category_id: '',
    expense_item_description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0], // Default to current date
    vendor_invoice_number: '',
    payment_method: '現金',
    notes: '',
    responsible_person: '',
    accounting_account_id: '' // 新增會計科目 ID
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false); // New loading state

  const handleChange = (e) => {
    const { name, value } = e.target;
    // 將空字串或特定 N/A 值轉換為 null，以便數據庫處理
    const newValue = (value === '' || value === 'N/A (無專案)' || value === 'N/A (無供應商)' || value === 'N/A (無科目)') ? null : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // 嚴格的客戶端驗證
    if (!formData.expense_item_description || !formData.amount || parseFloat(formData.amount) <= 0 ||
        !formData.expense_date || !formData.category_id || !formData.payment_method || !formData.accounting_account_id) {
      setError('請填寫所有標示為必填的欄位，並確保金額和選擇有效。');
      setLoading(false);
      return;
    }
    // 數字驗證
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
        setError('金額必須是有效的正數。');
        setLoading(false);
        return;
    }
    // ID 轉換為數字，處理可能為 null 的情況
    const parsedCategoryId = parseInt(formData.category_id);
    const parsedAccountingAccountId = parseInt(formData.accounting_account_id);

    if (isNaN(parsedCategoryId) || parsedCategoryId === 0 || isNaN(parsedAccountingAccountId) || parsedAccountingAccountId === 0) {
        setError('請為支出分類和會計科目選擇有效選項。');
        setLoading(false);
        return;
    }

    try {
      const payload = {
        ...formData,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
        category_id: parsedCategoryId, // 使用驗證後的 ID
        amount: parseFloat(formData.amount),
        accounting_account_id: parsedAccountingAccountId // 使用驗證後的 ID
      };

      const res = await axios.post(`${API_URL}/api/finance/expenses`, payload);
      setSuccess(res.data.message || '支出新增成功！');
      // 重置表單
      setFormData({
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
      onExpenseAdded(); // 觸發父組件的刷新
    } catch (err) {
      console.error('新增支出失敗:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.message || '新增支出失敗，請檢查輸入或聯繫管理員。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      {/* max-h-[90vh] 和 overflow-y-auto 讓模態框內容可滾動 */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl transform scale-100 transition-transform duration-300 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">新增支出</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="expense_item_description" className="block text-gray-700 text-sm font-bold mb-2">支出描述 <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="expense_item_description"
              name="expense_item_description"
              value={formData.expense_item_description || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">金額 (NT$) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="expense_date" className="block text-gray-700 text-sm font-bold mb-2">支出日期 <span className="text-red-500">*</span></label>
            <input
              type="date"
              id="expense_date"
              name="expense_date"
              value={formData.expense_date || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>

          <div>
            <label htmlFor="category_id" className="block text-gray-700 text-sm font-bold mb-2">支出分類 <span className="text-red-500">*</span></label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id || ''}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇分類</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-gray-700 text-sm font-bold mb-2">付款方式 <span className="text-red-500">*</span></label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method || ''}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇方式</option> {/* Added empty option */}
              <option value="現金">現金</option>
              <option value="銀行轉帳">銀行轉帳</option>
              <option value="信用卡">信用卡</option>
              <option value="支票">支票</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label htmlFor="accounting_account_id" className="block text-gray-700 text-sm font-bold mb-2">會計科目 <span className="text-red-500">*</span></label>
            <select
              id="accounting_account_id"
              name="accounting_account_id"
              value={formData.accounting_account_id || ''}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇會計科目</option>
              {expenseAccounts.map(account => (
                <option key={account.account_id} value={account.account_id}>{account.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project_id" className="block text-gray-700 text-sm font-bold mb-2">專案 (可選)</label>
            <select
              id="project_id"
              name="project_id"
              value={formData.project_id === null ? '' : formData.project_id} // Render null as empty string for select
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
            <label htmlFor="vendor_id" className="block text-gray-700 text-sm font-bold mb-2">供應商 (可選)</label>
            <select
              id="vendor_id"
              name="vendor_id"
              value={formData.vendor_id === null ? '' : formData.vendor_id} // Render null as empty string for select
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
            <label htmlFor="vendor_invoice_number" className="block text-gray-700 text-sm font-bold mb-2">供應商發票號碼 (可選)</label>
            <input
              type="text"
              id="vendor_invoice_number"
              name="vendor_invoice_number"
              value={formData.vendor_invoice_number || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            />
          </div>

          <div>
            <label htmlFor="responsible_person" className="block text-gray-700 text-sm font-bold mb-2">負責人 (可選)</label>
            <input
              type="text"
              id="responsible_person"
              name="responsible_person"
              value={formData.responsible_person || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">備註 (可選)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
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
              className="px-6 py-2 bg-[#C9C2B2] text-white rounded-full font-semibold hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
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