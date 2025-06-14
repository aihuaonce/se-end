import React from 'react';

export default function OverviewDetailModal({ dataType, data, onClose }) {
  const getTitle = (type) => {
    switch (type) {
      case 'revenue': return '總收入詳情';
      case 'expenses': return '總支出詳情';
      case 'receivables': return '代收款詳情';
      case 'invoiceCount': return '發票總數詳情';
      default: return '詳情';
    }
  };

  const renderContent = (type, detailData) => {
    if (!detailData || detailData.length === 0) {
      return <p className="text-center text-gray-500">沒有可用數據。</p>;
    }

    if (type === 'revenue' || type === 'expenses') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">月份</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {item.amount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (type === 'receivables' || type === 'invoiceCount') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">發票號碼</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客戶</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                {type === 'receivables' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>}
                {type === 'receivables' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">截止日期</th>}
                {type === 'invoiceCount' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">開立日期</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailData.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {item.amount?.toLocaleString()}</td>
                  {type === 'receivables' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.status}</td>}
                  {type === 'receivables' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.dueDate}</td>}
                  {type === 'invoiceCount' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.issueDate}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">{getTitle(dataType)}</h2>
        <div className="max-h-96 overflow-y-auto mb-6">
          {renderContent(dataType, data)}
        </div>
        <div className="flex justify-end">
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