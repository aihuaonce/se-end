import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PaymentModal({ invoice, onClose, onPaymentSuccess, API_URL }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 計算剩餘應付金額
  const outstandingAmount = (invoice.amount - invoice.amount_paid);

  // 初始化付款金額輸入框為剩餘應付金額
  useEffect(() => {
    setPaymentAmountInput(outstandingAmount.toFixed(2));
  }, [outstandingAmount]); // 只有當 outstandingAmount 改變時才更新

  // 模擬生成 QR code 的 URL
  const generateQRCodeUrl = (data) => {
    // 在實際應用中，這裡會調用一個 QR code 生成庫或 API
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
  };

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
    if (amountToPay > outstandingAmount + 0.001) { // 加上小數點誤差的緩衝
        setMessage('付款金額不能超過剩餘應付金額。');
        setLoading(false);
        return;
    }

    try {
      const payload = {
        invoiceId: invoice.id,
        paymentAmount: amountToPay,
        paymentMethod: selectedPaymentMethod,
        paymentDate: new Date().toISOString().split('T')[0] // 使用當前日期
      };
      const res = await axios.post(`${API_URL}/api/finance/process-payment`, payload);
      setMessage(res.data.message || '付款成功！');
      onPaymentSuccess(); // 刷新父組件數據
    } catch (err) {
      console.error('處理付款失敗:', err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.message || '付款失敗，請重試或聯繫管理員。');
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
              <label htmlFor="cashAmount" className="block text-gray-700 text-sm font-bold mb-2">
                現金收款金額 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="cashAmount"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
                max={outstandingAmount.toFixed(2)} // 限制最大金額
              />
            </div>
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-green-500 text-white font-semibold rounded-full shadow-md hover:bg-green-600 transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? '處理中...' : '確認收款'}
            </button>
          </div>
        );
      case '銀行轉帳': // 新增銀行轉帳選項
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="bankTransferAmount" className="block text-gray-700 text-sm font-bold mb-2">
                銀行轉帳金額 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="bankTransferAmount"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
                max={outstandingAmount.toFixed(2)}
              />
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-800">
              <p className="font-semibold">請將款項轉帳至以下帳戶：</p>
              <p>銀行名稱: XX 銀行</p>
              <p>帳號: 123-4567-8901234</p>
              <p>戶名: 小高婚慶有限公司</p>
            </div>
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-md hover:bg-blue-600 transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? '處理中...' : '確認轉帳完成'}
            </button>
          </div>
        );
      case '信用卡':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="creditCardAmount" className="block text-gray-700 text-sm font-bold mb-2">
                刷卡金額 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="creditCardAmount"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
                max={outstandingAmount.toFixed(2)}
              />
            </div>
            {paymentAmountInput > 0 && (
              <div className="flex flex-col items-center mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 font-semibold mb-2">請掃描以下 QR Code 或點擊連結完成刷卡：</p>
                <img
                  src={generateQRCodeUrl(`Invoice ID: ${invoice.id}, Amount: ${paymentAmountInput}, Method: ${selectedPaymentMethod}`)}
                  alt="Payment QR Code"
                  className="w-40 h-40 border border-gray-300 rounded-lg"
                />
                <a href="#" className="text-blue-500 hover:underline mt-2">點擊前往線上刷卡頁面</a>
                <p className="text-sm text-gray-500 mt-2">（此為模擬 QR Code 及連結）</p>
              </div>
            )}
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-purple-500 text-white font-semibold rounded-full shadow-md hover:bg-purple-600 transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? '處理中...' : '確認刷卡完成'}
            </button>
          </div>
        );
      case '線上付款':
        return (
          <div className="space-y-4">
             <div>
              <label htmlFor="onlinePaymentAmount" className="block text-gray-700 text-sm font-bold mb-2">
                線上付款金額 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="onlinePaymentAmount"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
                step="0.01"
                min="0"
                max={outstandingAmount.toFixed(2)}
              />
            </div>
            {paymentAmountInput > 0 && (
              <div className="flex flex-col items-center mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 font-semibold mb-2">請生成以下支付連結或 QR Code：</p>
                <img
                  src={generateQRCodeUrl(`Invoice ID: ${invoice.id}, Amount: ${paymentAmountInput}, Method: ${selectedPaymentMethod}`)}
                  alt="Payment QR Code"
                  className="w-40 h-40 border border-gray-300 rounded-lg"
                />
                <a href="#" className="text-blue-500 hover:underline mt-2">點擊複製付款連結</a>
                <p className="text-sm text-gray-500 mt-2">（此為模擬 QR Code 及連結）</p>
                <div className="mt-4 flex flex-col items-center">
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
                </div>
              </div>
            )}
            <button
              onClick={handlePaymentSubmit}
              className="w-full px-6 py-2 bg-yellow-500 text-white font-semibold rounded-full shadow-md hover:bg-yellow-600 transition duration-300 ease-in-out"
              disabled={loading}
            >
              {loading ? '處理中...' : '確認線上付款完成'}
            </button>
          </div>
        );
      default:
        return <p className="text-gray-500 text-center">請選擇一種付款方式來繼續。</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">發票 #{invoice.id} 付款</h2>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-lg font-semibold text-gray-800">應收金額: NT$ {invoice.amount?.toLocaleString()}</p>
            <p className="text-md text-gray-600">已付金額: NT$ {invoice.amount_paid?.toLocaleString()}</p>
            <p className="text-xl font-bold text-red-600">尚未支付: NT$ {outstandingAmount.toLocaleString()}</p>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-gray-700 text-md font-bold mb-2">選擇付款方式:</p>
          <div className="flex justify-around flex-wrap gap-2"> {/* Added flex-wrap and gap */}
            <button
              onClick={() => setSelectedPaymentMethod('現金')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out hover:scale-105
                ${selectedPaymentMethod === '現金' ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800 hover:bg-green-300'}`}
            >
              現金
            </button>
            <button
              onClick={() => setSelectedPaymentMethod('銀行轉帳')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out hover:scale-105
                ${selectedPaymentMethod === '銀行轉帳' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-800 hover:bg-blue-300'}`}
            >
              銀行轉帳
            </button>
            <button
              onClick={() => setSelectedPaymentMethod('信用卡')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out hover:scale-105
                ${selectedPaymentMethod === '信用卡' ? 'bg-purple-600 text-white' : 'bg-purple-200 text-purple-800 hover:bg-purple-300'}`}
            >
              刷卡
            </button>
            <button
              onClick={() => setSelectedPaymentMethod('線上付款')}
              className={`px-6 py-3 rounded-full font-semibold shadow-md transition duration-300 ease-in-out hover:scale-105
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