import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PaymentModal({ invoice, onClose, onPaymentSuccess, API_URL }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const outstandingAmount = (invoice.amount - invoice.amount_paid).toFixed(2);

  useEffect(() => {
    setPaymentAmountInput(outstandingAmount);
  }, [outstandingAmount]);


  const handlePaymentSubmit = async () => {
    setMessage('');
    setLoading(true);

    if (!selectedPaymentMethod) {
      setMessage('請選擇付款方式。');
      setLoading(false);
      return;
    }

    const amountToPay = parseFloat(paymentAmountInput);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      setMessage('請輸入有效的付款金額。');
      setLoading(false);
      return;
    }
    if (amountToPay > outstandingAmount) {
        setMessage('付款金額不能超過尚未支付的金額。');
        setLoading(false);
        return;
    }

    try {
      const payload = {
        invoiceId: invoice.id,
        paymentAmount: amountToPay,
        paymentMethod: selectedPaymentMethod,
      };
      const res = await axios.post(`${API_URL}/api/finance/process-payment`, payload);
      setMessage(res.data.message || '付款成功！');
      onPaymentSuccess();
    } catch (err) {
      console.error('處理付款失敗:', err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.message || '付款失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentDetails = () => {
    switch (selectedPaymentMethod) {
      case '現金':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cashAmount">
                現金收款金額
              </label>
              <input
                type="number"
                id="cashAmount"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
              />
            </div>
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-green-500 text-white font-semibold rounded-full shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? '處理中...' : '確認收款'}
            </button>
          </div>
        );
      case '信用卡':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                刷卡金額
              </label>
              <input
                type="number"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
              />
            </div>
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-purple-500 text-white font-semibold rounded-full shadow-md hover:bg-purple-600 transition duration-300 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? '處理中...' : '處理刷卡'}
            </button>
            {!loading && message.includes('成功') && <p className="text-center text-green-500">交易完成！</p>}
          </div>
        );
      case '線上付款':
        return (
          <div className="space-y-4">
             <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                線上付款金額
              </label>
              <input
                type="number"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
              />
            </div>
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-yellow-500 text-white font-semibold rounded-full shadow-md hover:bg-yellow-600 transition duration-300 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? '處理中...' : '產生連結/QR Code'}
            </button>
            <div className="flex flex-col items-center mt-4">
              <p className="text-gray-600">請選擇線上支付平台：</p>
              <button className="px-4 py-2 mt-2 bg-gray-200 rounded-full hover:bg-gray-300 transition duration-150 ease-in-out">
                台灣Pay
              </button>
              <button className="px-4 py-2 mt-2 bg-green-200 rounded-full hover:bg-green-300 transition duration-150 ease-in-out">
                Line Pay
              </button>
              <button className="px-4 py-2 mt-2 bg-blue-200 rounded-full hover:bg-blue-300 transition duration-150 ease-in-out">
                街口支付
              </button>
              <p className="text-sm text-gray-500 mt-2">（實際應用中會產生連結或QR Code）</p>
            </div>
            {!loading && message.includes('成功') && <p className="text-center text-green-500">付款連結已產生！</p>}
          </div>
        );
      default:
        return <p className="text-gray-500 text-center">請選擇一種付款方式。</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">發票 #{invoice.id} 付款</h2>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-lg font-semibold text-gray-800">應收金額: NT$ {invoice.amount?.toLocaleString()}</p>
            <p className="text-md text-gray-600">已付金額: NT$ {invoice.amount_paid?.toLocaleString()}</p>
            <p className="text-xl font-bold text-red-600">尚未支付: NT$ {(invoice.amount - invoice.amount_paid)?.toLocaleString()}</p>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-gray-700 text-md font-bold mb-2">選擇付款方式:</p>
          <div className="flex justify-around">
            <button
              onClick={() => setSelectedPaymentMethod('現金')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out transform hover:scale-105
                ${selectedPaymentMethod === '現金' ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800 hover:bg-green-300'}`}
            >
              現金
            </button>
            <button
              onClick={() => setSelectedPaymentMethod('信用卡')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out transform hover:scale-105
                ${selectedPaymentMethod === '信用卡' ? 'bg-purple-600 text-white' : 'bg-purple-200 text-purple-800 hover:bg-purple-300'}`}
            >
              刷卡
            </button>
            <button
              onClick={() => setSelectedPaymentMethod('線上付款')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out transform hover:scale-105
                ${selectedPaymentMethod === '線上付款' ? 'bg-yellow-600 text-white' : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'}`}
            >
              線上付款
            </button>
          </div>
        </div>

        {renderPaymentDetails()}

        {message && (
          <div className="text-center py-2 text-sm mt-4">
            <p className={message.includes('失敗') ? 'text-red-500' : 'text-green-500'}>{message}</p>
          </div>
        )}

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