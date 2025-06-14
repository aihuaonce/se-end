import React from 'react';

export default function PettyCashTable({ transactions, onDepositClick, isManager }) {
  // Calculate current balance and cumulative balance for each transaction
  const transactionsWithBalance = transactions.reduce((acc, t, index) => {
    const prevBalance = index > 0 ? acc[index - 1].currentBalance : 0;
    const currentBalance = prevBalance + parseFloat(t.debit_amount || 0) - parseFloat(t.credit_amount || 0);
    acc.push({ ...t, currentBalance });
    return acc;
  }, []);

  // Display the overall current balance (last transaction's cumulative balance)
  const overallCurrentBalance = transactionsWithBalance.length > 0 ? transactionsWithBalance[transactionsWithBalance.length - 1].currentBalance : 0;

  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">零用金收支管理</h3>
      <div className="mb-4 flex justify-between items-center">
        <h4 className="text-2xl font-bold text-gray-700">當前餘額: NT$ {overallCurrentBalance.toLocaleString()}</h4> {/* Display overall balance */}
        {isManager && (
          <button
            onClick={onDepositClick}
            // Updated button style to match FinancePage (1).jsx theme
            className="px-6 py-3 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-lg text-lg font-semibold"
          >
            存入零用金
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">交易日期</th> {/* Changed to 交易日期 */}
              <th className="p-3 text-left text-sm font-semibold tracking-wider">描述</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">借方金額 (入)</th> {/* Changed to (入) */}
              <th className="p-3 text-right text-sm font-semibold tracking-wider">貸方金額 (出)</th> {/* Changed to (出) */}
              <th className="p-3 text-right text-sm font-semibold tracking-wider rounded-tr-lg">累計餘額</th> {/* Added this column */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactionsWithBalance.length > 0 ? (
              transactionsWithBalance.map(t => (
                <tr key={t.line_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.entry_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.description}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {t.debit_amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {t.credit_amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right font-semibold">NT$ {t.currentBalance?.toLocaleString()}</td> {/* Display cumulative balance */}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">沒有零用金數據。</td> {/* Updated colspan */}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}