import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保這個 URL 正確指向您的後端伺服器

export default function FinancePage() { // 將 App 更名為 FinancePage
  const [view, setView] = useState('overview');
  // 概覽數據狀態，新增 totalExpenses
  const [overview, setOverview] = useState({ totalRevenue: 0, pendingPayments: 0, invoiceCount: 0, totalExpenses: 0 });
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState([]);
  const [monthlyReportData, setMonthlyReportData] = useState([]); // 新增月報表數據狀態
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); // 控制新增支出彈窗顯示

  // 各個下拉選單的數據狀態
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]); // 新增費用會計科目狀態

  useEffect(() => {
    // 根據當前視圖獲取資料
    switch (view) {
      case 'overview':
        fetchOverview();
        fetchMonthlyReport(); // 概覽頁面也需要月報表數據來顯示圖表
        break;
      case 'invoices':
        fetchInvoices();
        break;
      case 'customers':
        fetchCustomers();
        break;
      case 'payments':
        fetchPayments();
        break;
      case 'expenses':
        fetchExpenses();
        // 當切換到支出管理時，預先載入下拉選單數據
        fetchCategories();
        fetchVendors();
        fetchProjects();
        fetchExpenseAccounts(); // 載入費用會計科目
        break;
      case 'pettyCash':
        fetchPettyCash();
        break;
      case 'monthlyReport': // 新增月報表視圖
        fetchMonthlyReport();
        break;
      default:
        fetchOverview();
    }
  }, [view]);

  // 各個資料獲取函數
  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/overview`);
      setOverview(res.data);
    } catch (err) {
      console.error('Fetch overview error:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/invoices`);
      setInvoices(res.data);
    } catch (err) {
      console.error('Fetch invoices error:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Fetch customers error:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/payments`);
      setPayments(res.data);
    } catch (err) {
      console.error('Fetch payments error:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/expenses`);
      setExpenses(res.data);
    } catch (err) {
      console.error('Fetch expenses error:', err);
    }
  };

  const fetchPettyCash = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/pettycash`);
      setPettyCashTransactions(res.data);
    } catch (err) {
      console.error('Fetch petty cash error:', err);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/monthly-report`);
      setMonthlyReportData(res.data);
    } catch (err) {
      console.error('Fetch monthly report error:', err);
    }
  };

  // 獲取下拉選單數據的函數
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/vendors`);
      setVendors(res.data);
    } catch (err) {
      console.error('Fetch vendors error:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/projects`);
      setProjects(res.data);
    } catch (err) {
      console.error('Fetch projects error:', err);
    }
  };

  const fetchExpenseAccounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/accounts/expenses`);
      setExpenseAccounts(res.data);
    } catch (err) {
      console.error('Fetch expense accounts error:', err);
    }
  };


  // 新增支出成功後的回調函數
  const handleExpenseAdded = () => {
    setShowAddExpenseModal(false); // 關閉彈窗
    fetchExpenses(); // 刷新支出列表
    fetchOverview(); // 刷新概覽數據（更新總支出）
    fetchPettyCash(); // 刷新零用金數據 (如果支付方式影響現金科目)
    fetchMonthlyReport(); // 刷新月報表 (因為可能新增了費用)
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* 側邊導航欄 - 移除圓角 */}
      <aside className="w-64 bg-[#C9C2B2] text-white p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">財務子系統</h2>
        <nav className="space-y-4">
          {[
            { key: 'overview', label: '概覽' },
            { key: 'invoices', label: '發票管理' },
            { key: 'customers', label: '客戶管理' },
            { key: 'payments', label: '付款紀錄' },
            { key: 'expenses', label: '支出管理' },
            { key: 'pettyCash', label: '零用金收支管理' },
            { key: 'monthlyReport', label: '月報表' }
          ].map(item => (
            <button
              key={item.key}
              className={`block w-full text-left py-2 px-4 transition duration-300 ease-in-out
                ${view === item.key ? 'bg-white text-[#C9C2B2] font-semibold shadow-md' : 'hover:bg-[#B7B09F] hover:text-white'}`}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 主內容區域 */}
      <main className="flex-1 bg-gray-100 p-8">
        {view === 'overview' && <FinanceOverview data={overview} monthlyReportData={monthlyReportData} />}
        {view === 'invoices' && <InvoiceTable invoices={invoices} />}
        {view === 'customers' && <CustomerTable customers={customers} />}
        {view === 'payments' && <PaymentTable payments={payments} />}
        {view === 'expenses' && (
          <ExpenseTable
            expenses={expenses}
            onAddExpenseClick={() => setShowAddExpenseModal(true)}
          />
        )}
        {view === 'pettyCash' && <PettyCashTable transactions={pettyCashTransactions} />}
        {view === 'monthlyReport' && <MonthlyReportTable reportData={monthlyReportData} />}
      </main>

      {/* 新增支出彈窗 */}
      {showAddExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowAddExpenseModal(false)}
          onExpenseAdded={handleExpenseAdded}
          categories={categories}
          vendors={vendors}
          projects={projects}
          expenseAccounts={expenseAccounts}
        />
      )}
    </div>
  );
}

// 財務概覽組件 (新增總支出卡片及圖表)
function FinanceOverview({ data, monthlyReportData }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">財務概覽</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard label="總營收" value={data.totalRevenue} />
        <OverviewCard label="總支出" value={data.totalExpenses} />
        <OverviewCard label="待支付金額" value={data.pendingPayments} />
        <OverviewCard label="發票張數" value={data.invoiceCount} />
      </div>

      {/* 月度財務走勢圖 */}
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

// 概覽卡片組件
function OverviewCard({ label, value }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transform hover:scale-105 transition duration-300 ease-in-out">
      <p className="text-gray-500 text-lg">{label}</p>
      <p className="mt-2 text-4xl font-extrabold text-[#C9C2B2]">
        {typeof value === 'number' ? `NT$ ${value.toLocaleString()}` : value}
      </p>
    </div>
  );
}

// 發票表格組件 (新增列印功能)
function InvoiceTable({ invoices }) {
  const invoiceRefs = useRef({}); // 用於儲存每個發票的 DOM 引用

  const handlePrintInvoice = async (invoice) => {
    // 構建要列印的內容的 HTML 字串，簡化為一個臨時 div 包含發票信息
    // 實際應用中，您會希望這裡有一個專門的、詳細的發票模板
    const invoiceContent = `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; background-color: white;">
        <h1 style="text-align: center; color: #C9C2B2; margin-bottom: 20px;">發票 #${invoice.id}</h1>
        <div style="margin-bottom: 20px;">
          <p><strong>客戶:</strong> ${invoice.customer}</p>
          <p><strong>開立日期:</strong> ${invoice.issueDate}</p>
          <p><strong>繳款截止日:</strong> ${invoice.dueDate}</p>
          <p><strong>狀態:</strong> ${invoice.paid}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">項目</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">金額 (NT$)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">服務費</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${invoice.amount?.toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">總金額</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">NT$ ${invoice.amount?.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <p style="text-align: right; margin-top: 30px;">感謝您的惠顧！</p>
      </div>
    `;

    // 創建一個臨時 div 來渲染 HTML 內容
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>發票 #' + invoice.id + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      @page { size: A4; margin: 10mm; }
      body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
      h1, h2, h3, h4, h5, h6 { color: #C9C2B2; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(invoiceContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    // 等待內容加載完成
    printWindow.onload = () => {
        // 使用 setTimeout 確保所有內容都已渲染，然後執行列印
        setTimeout(() => {
            printWindow.print();
            printWindow.close(); // 列印後關閉視窗
        }, 500); // 延遲 500ms，可以根據實際內容複雜度調整
    };
  };


  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">發票管理</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">發票號碼</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">客戶</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">開立日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">繳款截止日</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.paid === '已付' ? 'bg-green-100 text-green-800' : (inv.paid === '未付' || inv.paid === '逾期' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                      {inv.paid}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => handlePrintInvoice(inv)}
                      className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      列印 / 匯出 PDF
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">沒有發票數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 客戶表格組件
function CustomerTable({ customers }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">客戶管理</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">客戶編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">聯絡人</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">電話</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">Email</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length > 0 ? (
              customers.map(c => (
                <tr key={c.customer_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.customer_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.name}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.contact_person}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.phone}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.email}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">沒有客戶數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 付款表格組件
function PaymentTable({ payments }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">付款紀錄</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider ">付款編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">客戶名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">付款日期</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">發票號碼</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">狀態</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length > 0 ? (
              payments.map(p => (
                <tr key={p.payment_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.payment_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.project_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.customer_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.payment_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {p.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.method}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.invoice_ids || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === '已付款' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">沒有付款數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 支出表格組件 (新增按鈕)
function ExpenseTable({ expenses, onAddExpenseClick }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-[#C9C2B2]">支出管理</h3>
        <button
          onClick={onAddExpenseClick}
          className="px-6 py-2 bg-[#C9C2B2] text-white font-semibold rounded-full shadow-md hover:bg-[#B7B09F] transition duration-300 ease-in-out transform hover:scale-105"
        >
          新增支出
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">支出編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">供應商</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">分類</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">支出項目</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">廠商發票號碼</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length > 0 ? (
              expenses.map(e => (
                <tr key={e.expense_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.expense_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.project_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.vendor_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.category_name || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.description}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {e.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.expense_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.responsible_person || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.vendor_invoice_number || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="p-4 text-center text-gray-500">沒有支出數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 零用金收支管理組件
function PettyCashTable({ transactions }) {
  // 計算累計餘額
  const transactionsWithBalance = transactions.reduce((acc, t, index) => {
    const prevBalance = index > 0 ? acc[index - 1].currentBalance : 0;
    const currentBalance = prevBalance + parseFloat(t.debit_amount || 0) - parseFloat(t.credit_amount || 0);
    acc.push({ ...t, currentBalance });
    return acc;
  }, []);

  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">零用金收支管理</h3>
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

// 月報表組件 - 新增
function MonthlyReportTable({ reportData }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">每月財務報表</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
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
              reportData.map(row => (
                <tr key={row.month} className="hover:bg-gray-50 transition duration-150 ease-in-out">
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


// 新增支出彈窗組件
function AddExpenseModal({ onClose, onExpenseAdded, categories, vendors, projects, expenseAccounts }) {
  // 表單狀態
  const [expenseData, setExpenseData] = useState({
    project_id: '',
    vendor_id: '',
    category_id: '',
    expense_item_description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0], // 預設為今天
    vendor_invoice_number: '',
    payment_method: '現金', // 預設支付方式
    notes: '',
    responsible_person: '', // 負責人字段
    accounting_account_id: '' // 會計科目 ID
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    // 將空字串轉換為 null 或 undefined，以便於後端處理外來鍵
    const newValue = (value === '' || value === 'N/A (無專案)' || value === 'N/A (無供應商)' || value === 'N/A (無科目)') ? null : value;
    setExpenseData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // 驗證必要字段
      if (!expenseData.expense_item_description || !expenseData.amount || !expenseData.expense_date || !expenseData.category_id || !expenseData.payment_method || !expenseData.accounting_account_id) {
        setMessage('請填寫所有標示為必填的欄位。');
        setLoading(false);
        return;
      }
      if (isNaN(parseFloat(expenseData.amount)) || parseFloat(expenseData.amount) <= 0) {
          setMessage('金額必須是有效的正數。');
          setLoading(false);
          return;
      }

      // 由於 project_id, vendor_id, accounting_account_id 在 select 中可能為 '' 或 null，
      // axios 會將其作為 'null' 字串發送，需要確保是實際的 null 或數字
      const payload = {
        ...expenseData,
        project_id: expenseData.project_id ? parseInt(expenseData.project_id) : null,
        vendor_id: expenseData.vendor_id ? parseInt(expenseData.vendor_id) : null,
        category_id: parseInt(expenseData.category_id), // 確保是數字
        amount: parseFloat(expenseData.amount), // 確保是數字
        accounting_account_id: parseInt(expenseData.accounting_account_id) // 確保是數字
      };


      const res = await axios.post(`${API_URL}/api/finance/expenses`, payload);
      setMessage(res.data.message || '支出新增成功！');
      // 清空表單
      setExpenseData({
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
      onExpenseAdded(); // 通知父組件刷新數據並關閉彈窗
    } catch (err) {
      console.error('新增支出失敗:', err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.message || '新增支出失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">新增支出</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 支出項目 (描述) */}
          <div className="col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expense_item_description">
              支出項目 (描述) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="expense_item_description"
              name="expense_item_description"
              value={expenseData.expense_item_description}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>

          {/* 金額 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
              金額 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={expenseData.amount}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
              step="0.01"
              min="0"
            />
          </div>

          {/* 負責人 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="responsible_person">
              負責人 (可選)
            </label>
            <input
              type="text"
              id="responsible_person"
              name="responsible_person"
              value={expenseData.responsible_person}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            />
          </div>

          {/* 支出日期 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expense_date">
              支出日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="expense_date"
              name="expense_date"
              value={expenseData.expense_date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>

          {/* 支出分類 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category_id">
              支出分類 <span className="text-red-500">*</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              value={expenseData.category_id}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 會計科目 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="accounting_account_id">
              會計科目 <span className="text-red-500">*</span>
            </label>
            <select
              id="accounting_account_id"
              name="accounting_account_id"
              value={expenseData.accounting_account_id}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="">請選擇</option>
              {expenseAccounts.map(account => (
                <option key={account.account_id} value={account.account_id}>{account.display_name}</option>
              ))}
            </select>
          </div>

          {/* 婚禮專案 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="project_id">
              婚禮專案 (可選)
            </label>
            <select
              id="project_id"
              name="project_id"
              value={expenseData.project_id || ''} // 處理 null 值
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            >
              <option value="">N/A (無專案)</option>
              {projects.map(proj => (
                <option key={proj.project_id} value={proj.project_id}>{proj.project_name}</option>
              ))}
            </select>
          </div>

          {/* 供應商 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendor_id">
              供應商 (可選)
            </label>
            <select
              id="vendor_id"
              name="vendor_id"
              value={expenseData.vendor_id || ''} // 處理 null 值
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            >
              <option value="">N/A (無供應商)</option>
              {vendors.map(vendor => (
                <option key={vendor.vendor_id} value={vendor.vendor_id}>{vendor.name}</option>
              ))}
            </select>
          </div>

          {/* 支付方式 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="payment_method">
              支付方式 <span className="text-red-500">*</span>
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={expenseData.payment_method}
              onChange={handleChange}
              className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            >
              <option value="現金">現金</option>
              <option value="銀行轉帳">銀行轉帳</option>
              <option value="信用卡">信用卡</option>
              <option value="支票">支票</option>
              <option value="其他">其他</option>
            </select>
          </div>

          {/* 廠商發票號碼 */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendor_invoice_number">
              廠商發票號碼 (可選)
            </label>
            <input
              type="text"
              id="vendor_invoice_number"
              name="vendor_invoice_number"
              value={expenseData.vendor_invoice_number}
              onChange={handleChange}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            />
          </div>

          {/* 備註 */}
          <div className="col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
              備註 (可選)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={expenseData.notes}
              onChange={handleChange}
              rows="3"
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            ></textarea>
          </div>

          {/* 訊息顯示 */}
          {message && (
            <div className="col-span-2 text-center py-2 text-sm">
              <p className={message.includes('失敗') ? 'text-red-500' : 'text-green-500'}>{message}</p>
            </div>
          )}

          {/* 按鈕 */}
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
              className="px-6 py-2 bg-[#C9C2B2] text-white font-semibold rounded-full shadow-md hover:bg-[#B7B09F] transition duration-300 ease-in-out transform hover:scale-105"
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
