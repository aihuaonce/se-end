import React from 'react';

export default function PettyCashTable({ transactions, onDepositClick, isManager }) {
  const transactionsWithBalance = transactions.reduce((acc, t, index) => {
    const prevBalance = index > 0 ? acc[index - 1].currentBalance : 0;
    const currentBalance = prevBalance + parseFloat(t.debit_amount || 0) - parseFloat(t.credit_amount || 0);
    acc.push({ ...t, currentBalance });
    return acc;
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-[#C9C2B2]">零用金收支管理</h3>
        {isManager && (
          <button
            onClick={onDepositClick}
            className="px-6 py-2 bg-purple-500 text-white font-semibold rounded-full shadow-md hover:bg-purple-600 transition duration-300 ease-in-out transform hover:scale-105"
          >
            存入零用金
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">交易編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">描述</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">借方金額 (收入)</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">貸方金額 (支出)</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider rounded-tr-lg">累計餘額</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactionsWithBalance.length > 0 ? (
              transactionsWithBalance.map(t => (
                <tr key={t.entry_id + '-' + t.line_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.entry_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.entry_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.description}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {t.debit_amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {t.credit_amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right font-semibold">NT$ {t.currentBalance?.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">沒有零用金數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}