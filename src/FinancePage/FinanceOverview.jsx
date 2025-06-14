import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function FinanceOverview({ data, monthlyReportData, onCardClick }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">財務概覽</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard label="總營收" value={data.totalRevenue} onClick={() => onCardClick('revenue')} />
        <OverviewCard label="總支出" value={data.totalExpenses} onClick={() => onCardClick('expenses')} />
        <OverviewCard label="代收款" value={data.totalReceivables} onClick={() => onCardClick('receivables')} />
        <OverviewCard label="發票總數" value={data.invoiceCount} onClick={() => onCardClick('invoiceCount')} />
      </div>

      <h4 className="text-2xl font-bold mb-4 text-[#C9C2B2]">月度財務走勢</h4>
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        {monthlyReportData && monthlyReportData.length > 0 ? (
          <>
            <h5 className="text-xl font-semibold mb-4 text-gray-700">收入與支出趨勢</h5>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyReportData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="total_revenue" name="總收入" stroke="#82ca9d" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="total_expenses" name="總支出" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>

            <h5 className="text-xl font-semibold mt-8 mb-4 text-gray-700">淨利潤/虧損趨勢</h5>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyReportData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="net_profit_loss" name="淨利潤/虧損" stroke="#ffc658" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="p-4 text-center text-gray-500">沒有足夠的月度數據來顯示圖表。</p>
        )}
      </div>
    </div>
  );
}

function OverviewCard({ label, value, onClick }) {
  return (
    <div
      className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transform hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
      onClick={onClick}
    >
      <p className="text-gray-500 text-lg">{label}</p>
      <p className="mt-2 text-4xl font-extrabold text-[#C9C2B2]">
        {typeof value === 'number' ? `NT$ ${value.toLocaleString()}` : value}
      </p>
    </div>
  );
}