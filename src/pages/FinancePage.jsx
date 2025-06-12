import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保這個 URL 正確指向您的後端伺服器

export default function App() {
  const [view, setView] = useState('overview');
  const [overview, setOverview] = useState({ totalRevenue: 0, pendingPayments: 0, invoiceCount: 0 });
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    // 根據當前視圖獲取資料
    switch (view) {
      case 'overview':
        fetchOverview();
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
        break;
      default:
        fetchOverview();
    }
  }, [view]);

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

  return (
    <div className="min-h-screen flex font-sans">
      {/* 側邊導航欄 */}
      <aside className="w-64 bg-[#C9C2B2] text-white p-6 shadow-lg rounded-r-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">財務子系統</h2>
        <nav className="space-y-4">
          {[
            { key: 'overview', label: '概覽' },
            { key: 'invoices', label: '發票管理' },
            { key: 'customers', label: '客戶管理' },
            { key: 'payments', label: '付款紀錄' },
            { key: 'expenses', label: '支出管理' }
          ].map(item => (
            <button
              key={item.key}
              className={`block w-full text-left py-2 px-4 rounded-xl transition duration-300 ease-in-out
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
        {view === 'overview' && <FinanceOverview data={overview} />}
        {view === 'invoices' && <InvoiceTable invoices={invoices} />}
        {view === 'customers' && <CustomerTable customers={customers} />}
        {view === 'payments' && <PaymentTable payments={payments} />}
        {view === 'expenses' && <ExpenseTable expenses={expenses} />}
      </main>
    </div>
  );
}

// 財務概覽組件
function FinanceOverview({ data }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">財務概覽</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverviewCard label="總營收" value={data.totalRevenue} />
        <OverviewCard label="待支付金額" value={data.pendingPayments} />
        <OverviewCard label="發票張數" value={data.invoiceCount} />
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

// 發票表格組件
function InvoiceTable({ invoices }) {
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
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">狀態</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer || inv.customer_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.paid === '已付' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {inv.paid}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">沒有發票數據。</td>
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
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{c.contact_person}</td> {/* Changed from contact_name */}
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
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">付款編號</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">客戶名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">付款日期</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">發票號碼</th> {/* Added for invoice_ids */}
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
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.invoice_ids || 'N/A'}</td> {/* Display joined invoice IDs */}
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

// 支出表格組件
function ExpenseTable({ expenses }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">支出管理</h3>
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
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">廠商發票號碼</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length > 0 ? (
              expenses.map(e => (
                <tr key={e.expense_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.expense_id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.project_name || 'N/A'}</td> {/* Assuming project_name is joined */}
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.vendor_name || 'N/A'}</td> {/* Display vendor_name */}
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.category_name || e.category_id}</td> {/* Display category_name */}
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.description}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {e.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.expense_date}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{e.vendor_invoice_number || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">沒有支出數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
