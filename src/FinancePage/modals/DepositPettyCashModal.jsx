import React, { useState } from 'react';
import axios from 'axios';

export default function DepositPettyCashModal({ onClose, onDepositSuccess, API_URL }) {
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !depositDate) {
      setMessage('請輸入有效的存入金額和日期。');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        amount: parseFloat(amount),
        deposit_date: depositDate,
        notes: notes,
      };
      const res = await axios.post(`${API_URL}/api/finance/pettycash/deposit`, payload);
      setMessage(res.data.message || '零用金存入成功！');
      onDepositSuccess();
    } catch (err) {
      console.error('存入零用金失敗:', err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.message || '存入零用金失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">存入零用金</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositAmount">
              存入金額 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="depositAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositDate">
              存入日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="depositDate"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositNotes">
              備註 (可選)
            </label>
            <textarea
              id="depositNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            ></textarea>
          </div>

          {message && (
            <div className="text-center py-2 text-sm">
              <p className={message.includes('失敗') ? 'text-red-500' : 'text-green-500'}>{message}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
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
              {loading ? '提交中...' : '確認存入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}