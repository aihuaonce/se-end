import React from 'react';

export default function MonthlyReportTable({ reportData, monthlyReportRef, onExportPdf }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-[#C9C2B2]">每月財務報表</h3>
        <button
          onClick={onExportPdf}
          // Updated button style to match FinancePage (1).jsx theme
          className="px-6 py-3 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-lg text-lg font-semibold"
        >
          匯出為 PDF
        </button>
      </div>
      <div ref={monthlyReportRef} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 p-4">
        <h4 className="text-2xl font-bold mb-4 text-gray-700 text-center">月度財務總結</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">月份</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">總收入</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">總支出</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider rounded-tr-lg">淨利潤/虧損</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.length > 0 ? (
              reportData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{row.month}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {row.total_revenue?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {row.total_expenses?.toLocaleString()}</td>
                  <td className={`p-3 whitespace-nowrap text-sm font-semibold text-right ${row.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    NT$ {row.net_profit_loss?.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">沒有月報表數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}