import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

export default function FinanceOverview({ 
  data, 
  monthlyReportData, 
  expenseByCategoryData, 
  revenueByProjectData, 
  invoicePaymentMethodData, 
  invoiceStatusData, 
  topCustomersData, 
  onCardClick 
}) {
  // 圖表顏色定義
  const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1942', '#8B008B', '#00FFFF', '#FF6347', '#4682B4'];

  // 將付款方式數據轉換為適合 RadarChart 的格式
  const radarChartData = invoicePaymentMethodData.map(item => ({
    method: item.method,
    amount: item.total_amount,
  }));

  // 計算 RadarChart 的極半徑軸的最大值，確保所有數據點都在圖表範圍內
  const maxAmount = radarChartData.length > 0 ? Math.max(...radarChartData.map(item => item.amount)) * 1.1 : 100; // 增加10%的緩衝，若無數據則預設為100

  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">財務概覽</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard label="總營收" value={data.totalRevenue} onClick={() => onCardClick('revenue')} />
        <OverviewCard label="總支出" value={data.totalExpenses} onClick={() => onCardClick('expenses')} />
        <OverviewCard label="代收款" value={data.totalReceivables} onClick={() => onCardClick('receivables')} />
        <OverviewCard label="發票總數" value={data.invoiceCount} onClick={() => onCardClick('invoiceCount')} />
      </div>

      {/* 月度財務走勢圖表 */}
      <h4 className="text-2xl font-bold mb-4 text-[#C9C2B2]">月度財務走勢與分佈</h4>
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
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

      {/* 新增的報告圖表區域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 支出分類分佈圖 (長條圖) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h5 className="text-xl font-semibold mb-4 text-gray-700">支出分類分佈圖</h5>
          {expenseByCategoryData && expenseByCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseByCategoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category_name" />
                <YAxis />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="amount" name="支出金額" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有足夠的支出分類數據來顯示圖表。</p>
          )}
        </div>

        {/* 專案營收分佈圖 (長條圖) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h5 className="text-xl font-semibold mb-4 text-gray-700">專案營收分佈圖</h5>
          {revenueByProjectData && revenueByProjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByProjectData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project_name" />
                <YAxis />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="total_revenue" name="專案營收" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有足夠的專案營收數據來顯示圖表。</p>
          )}
        </div>

        {/* 付款方式分佈圖 (雷達圖) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h5 className="text-xl font-semibold mb-4 text-gray-700">付款方式分佈圖</h5>
          {radarChartData && radarChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="method" />
                <PolarRadiusAxis angle={30} domain={[0, maxAmount]} /> {/* 動態設置軸範圍 */}
                <Radar name="總金額" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有足夠的付款方式數據來顯示圖表。</p>
          )}
        </div>

        {/* 發票狀態分佈圖 (圓餅圖) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h5 className="text-xl font-semibold mb-4 text-gray-700">發票狀態分佈圖</h5>
          {invoiceStatusData && invoiceStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={invoiceStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                  label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                >
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} 張發票`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有足夠的發票狀態數據來顯示圖表。</p>
          )}
        </div>
      </div>

      {/* 前五大客戶營收分佈圖 (新一行) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h5 className="text-xl font-semibold mb-4 text-gray-700">前五大客戶營收分佈圖</h5>
          {topCustomersData && topCustomersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomersData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="customer_name" />
                <YAxis />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="total_revenue" name="總營收" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有足夠的前五大客戶營收數據來顯示圖表。</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Card Component (added onClick prop)
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