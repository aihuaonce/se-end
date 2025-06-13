import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保這個 URL 正確指向您的後端伺服器

export default function FinancePage() {
  const [view, setView] = useState('overview');
  // 概覽數據狀態，更新 totalReceivables
  const [overview, setOverview] = useState({ totalRevenue: 0, totalReceivables: 0, invoiceCount: 0, totalExpenses: 0 });
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState([]);
  const [monthlyReportData, setMonthlyReportData] = useState([]); // 新增月報表數據狀態
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); // 控制新增支出彈窗顯示
  const [showPaymentModal, setShowPaymentModal] = useState(false); // 控制付款彈窗顯示
  const [selectedInvoice, setSelectedInvoice] = useState(null); // 儲存選中的發票

  const [showPettyCashDepositModal, setShowPettyCashDepositModal] = useState(false); // 零用金存入彈窗
  const [isManager, setIsManager] = useState(true); // 模擬主管權限，實際應用中應來自認證系統

  const [showOverviewDetailModal, setShowOverviewDetailModal] = useState(false); // 概覽細項彈窗
  const [overviewDetailType, setOverviewDetailType] = useState(''); // 概覽細項類型 (revenue, expenses, receivables, invoices)
  const [overviewDetailData, setOverviewDetailData] = useState([]); // 概覽細項數據

  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false); // 客戶詳情彈窗
  const [selectedCustomer, setSelectedCustomer] = useState(null); // 儲存選中的客戶

  // 各個下拉選單的數據狀態
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]); // 新增費用會計科目狀態

  // 月報表匯出 PDF 的 ref
  const monthlyReportRef = useRef(null);

  // 動態載入 jsPDF 和 html2canvas 函式庫
  useEffect(() => {
    const loadScript = (src, id, callback) => {
      if (document.getElementById(id)) {
        if (callback) callback();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.onload = () => {
        console.log(`${id} loaded successfully.`);
        if (callback) callback();
      };
      script.onerror = () => console.error(`Failed to load ${id} from ${src}`);
      document.head.appendChild(script);
    };

    // 確保 jsPDF 和 html2canvas 在 window 對象上可用
    // jsPDF (UMD 版本會將其附加到 window.jspdf 或 window.jsPDF.default)
    if (typeof window.jsPDF === 'undefined') {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
        // UMD 載入後，jsPDF 實例可能在 window.jspdf.jsPDF 或 window.jspdf
        // 這裡確保 window.jsPDF 指向正確的建構函式
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
          window.jsPDF = window.jspdf.jsPDF;
        } else if (typeof window.jspdf !== 'undefined') {
          window.jsPDF = window.jspdf;
        }
      });
    }

    // html2canvas
    if (typeof window.html2canvas === 'undefined') {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script');
    }
  }, []); // 空依賴陣列表示只在組件掛載時執行一次


  useEffect(() => {
    // 根據當前視圖獲取資料
    const fetchData = async () => {
      try {
        switch (view) {
          case 'overview':
            await fetchOverview();
            await fetchMonthlyReport(); // 概覽頁面也需要月報表數據來顯示圖表
            break;
          case 'invoices':
            await fetchInvoices();
            break;
          case 'customers':
            await fetchCustomers();
            break;
          case 'payments':
            await fetchPayments();
            break;
          case 'expenses':
            await fetchExpenses();
            // 當切換到支出管理時，預先載入下拉選單數據
            await fetchCategories();
            await fetchVendors();
            await fetchProjects();
            await fetchExpenseAccounts(); // 載入費用會計科目
            break;
          case 'pettyCash':
            await fetchPettyCash();
            break;
          case 'monthlyReport': // 新增月報表視圖
            await fetchMonthlyReport();
            break;
          default:
            await fetchOverview();
        }
      } catch (error) {
        console.error("Error fetching data for view:", view, error);
      }
    };

    fetchData();
  }, [view]);

  // 各個資料獲取函數
  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/overview`);
      // 更新概覽數據，將 totalReceivables 從後端對應到 state
      setOverview({
        totalRevenue: res.data.totalRevenue,
        totalReceivables: res.data.totalReceivables, // 從後端獲取代收款
        invoiceCount: res.data.invoiceCount,
        totalExpenses: res.data.totalExpenses
      });
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

  // 處理付款成功後的回調
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false); // 關閉付款彈窗
    setSelectedInvoice(null); // 清除選中的發票
    fetchInvoices(); // 刷新發票列表
    fetchOverview(); // 刷新概覽數據（更新代收款）
    fetchPayments(); // 刷新付款記錄
    fetchPettyCash(); // 刷新零用金 (如果支付方式影響現金科目)
  };

  // 點擊付款按鈕
  const handleInitiatePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  // 處理概覽卡片點擊，顯示細項
  const handleOverviewCardClick = async (type) => {
    setOverviewDetailType(type);
    let data = [];
    try {
      if (type === 'revenue') {
        // 從月報表數據中篩選出收入相關的細節
        data = monthlyReportData.map(item => ({
          month: item.month,
          amount: item.total_revenue,
          description: '總收入'
        }));
      } else if (type === 'expenses') {
        // 從月報表數據中篩選出支出相關的細節
        data = monthlyReportData.map(item => ({
          month: item.month,
          amount: item.total_expenses,
          description: '總支出'
        }));
      } else if (type === 'receivables') {
        // 代收款細項：未付/部分付款/逾期發票
        const res = await axios.get(`${API_URL}/api/finance/invoices`);
        data = res.data.filter(inv => inv.paid === '未付' || inv.paid === '部分付款' || inv.paid === '逾期')
                        .map(inv => ({
                          id: inv.id,
                          customer: inv.customer_company_name,
                          amount: inv.amount - inv.amount_paid,
                          status: inv.paid,
                          dueDate: inv.dueDate,
                          type: 'invoice'
                        }));
      } else if (type === 'invoiceCount') {
        // 發票總數細項：所有發票
        const res = await axios.get(`${API_URL}/api/finance/invoices`);
        data = res.data.map(inv => ({
          id: inv.id,
          customer: inv.customer_company_name,
          amount: inv.amount,
          status: inv.paid,
          issueDate: inv.issueDate,
          type: 'invoice'
        }));
      }
      setOverviewDetailData(data);
      setShowOverviewDetailModal(true);
    } catch (error) {
      console.error(`Error fetching detail for ${type}:`, error);
      // 可以顯示一個錯誤訊息給用戶
    }
  };

  // 處理客戶點擊，顯示客戶詳情
  const handleCustomerClick = async (customer) => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/customers/${customer.customer_id}/details`);
      setSelectedCustomer(res.data);
      setShowCustomerDetailModal(true);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  // 匯出月報表為 PDF
  const exportMonthlyReportPdf = async () => {
    // 檢查 jsPDF 和 html2canvas 是否已載入
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
      console.error("PDF export libraries not loaded yet.");
      alert("PDF 匯出功能尚未載入，請稍後再試。"); // 使用 alert 暫時替代，實際應用中可替換為自定義消息框
      return;
    }

    if (monthlyReportRef.current) {
      const input = monthlyReportRef.current;
      // 確保 canvas 已經可用
      await new Promise(resolve => setTimeout(resolve, 100)); // 給點時間讓 html2canvas 準備
      
      window.html2canvas(input, { // 使用 window.html2canvas
        scale: 2, // 提高解析度
        useCORS: true, // 允許跨域圖片，如果有的話
        logging: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jsPDF('p', 'mm', 'a4'); // 使用 window.jsPDF
        const imgWidth = 210; // A4 寬度
        const pageHeight = 297; // A4 高度
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save('monthly_financial_report.pdf');
      }).catch(err => {
        console.error("Failed to export PDF:", err);
        alert(`匯出 PDF 失敗: ${err.message}`);
      });
    }
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
        {view === 'overview' && <FinanceOverview data={overview} monthlyReportData={monthlyReportData} onCardClick={handleOverviewCardClick} />}
        {view === 'invoices' && <InvoiceTable invoices={invoices} onInitiatePayment={handleInitiatePayment} />}
        {view === 'customers' && <CustomerTable customers={customers} onCustomerClick={handleCustomerClick} />}
        {view === 'payments' && <PaymentTable payments={payments} />}
        {view === 'expenses' && (
          <ExpenseTable
            expenses={expenses}
            onAddExpenseClick={() => setShowAddExpenseModal(true)}
          />
        )}
        {view === 'pettyCash' && <PettyCashTable transactions={pettyCashTransactions} onDepositClick={() => setShowPettyCashDepositModal(true)} isManager={isManager} />}
        {view === 'monthlyReport' && <MonthlyReportTable reportData={monthlyReportData} monthlyReportRef={monthlyReportRef} onExportPdf={exportMonthlyReportPdf} />}
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

      {/* 付款彈窗 */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* 零用金存入彈窗 */}
      {showPettyCashDepositModal && (
        <DepositPettyCashModal
          onClose={() => setShowPettyCashDepositModal(false)}
          onDepositSuccess={() => { fetchPettyCash(); fetchOverview(); setShowPettyCashDepositModal(false); }}
        />
      )}

      {/* 概覽細項彈窗 */}
      {showOverviewDetailModal && (
        <OverviewDetailModal
          dataType={overviewDetailType}
          data={overviewDetailData}
          onClose={() => setShowOverviewDetailModal(false)}
        />
      )}

      {/* 客戶詳情彈窗 */}
      {showCustomerDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customerData={selectedCustomer}
          onClose={() => setShowCustomerDetailModal(false)}
        />
      )}
    </div>
  );
}

// 財務概覽組件 (更新代收款標籤，增加可點擊性)
function FinanceOverview({ data, monthlyReportData, onCardClick }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">財務概覽</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard label="總營收" value={data.totalRevenue} onClick={() => onCardClick('revenue')} />
        <OverviewCard label="總支出" value={data.totalExpenses} onClick={() => onCardClick('expenses')} />
        <OverviewCard label="代收款" value={data.totalReceivables} onClick={() => onCardClick('receivables')} /> {/* 更新標籤 */}
        <OverviewCard label="發票總數" value={data.invoiceCount} onClick={() => onCardClick('invoiceCount')} />
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

// 概覽卡片組件 (增加 onClick 屬性)
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

// 概覽細項彈窗
function OverviewDetailModal({ dataType, data, onClose }) {
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


// 發票表格組件 (新增公司名稱、負責人姓名、付款按鈕，列印按鈕文字修改)
function InvoiceTable({ invoices, onInitiatePayment }) {
  const handlePrintInvoice = async (invoice) => {
    // 檢查 jsPDF 和 html2canvas 是否已載入
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
      console.error("PDF export libraries not loaded yet.");
      alert("PDF 匯出功能尚未載入，請稍後再試。"); // 使用 alert 暫時替代
      return;
    }

    const invoiceContent = `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; background-color: white;">
        <h1 style="text-align: center; color: #C9C2B2; margin-bottom: 20px;">發票 #${invoice.id}</h1>
        <div style="margin-bottom: 20px;">
          <p><strong>公司名稱:</strong> ${invoice.customer_company_name}</p>
          <p><strong>負責人姓名:</strong> ${invoice.customer_contact_person || 'N/A'}</p>
          <p><strong>開立日期:</strong> ${invoice.issueDate}</p>
          <p><strong>繳款截止日:</strong> ${invoice.dueDate}</p>
          <p><strong>狀態:</strong> ${invoice.paid}</p>
          <p><strong>已付金額:</strong> NT$ ${invoice.amount_paid?.toLocaleString()}</p>
          <p><strong>尚未支付:</strong> NT$ ${(invoice.amount - invoice.amount_paid).toLocaleString()}</p>
          <p><strong>預計分期數:</strong> ${invoice.total_installments || 1} 期</p>
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

    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
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
              <th className="p-3 text-left text-sm font-semibold tracking-wider">公司名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人姓名</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">開立日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">繳款截止日</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">總金額</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">已付金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">分期數</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer_company_name}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer_contact_person || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount_paid?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${inv.paid === '已付' ? 'bg-green-100 text-green-800' :
                        (inv.paid === '未付' || inv.paid === '逾期' || inv.paid === '部分付款' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                      {inv.paid}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.total_installments}</td>
                  <td className="p-3 whitespace-nowrap text-center space-x-2">
                    {/* 只有未付或部分付款的發票顯示付款按鈕 */}
                    {(inv.paid === '未付' || inv.paid === '部分付款' || inv.paid === '逾期') && (
                      <button
                        onClick={() => onInitiatePayment(inv)}
                        className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        付款
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintInvoice(inv)}
                      className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      列印
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-500">沒有發票數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 客戶表格組件 (新增查看詳情按鈕)
function CustomerTable({ customers, onCustomerClick }) {
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
              <th className="p-3 text-left text-sm font-semibold tracking-wider">Email</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
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
                  <td className="p-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => onCustomerClick(c)}
                      className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-indigo-600 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">沒有客戶數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 客戶詳情彈窗
function CustomerDetailModal({ customerData, onClose }) {
  const { customer, invoices, payments } = customerData;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">客戶詳情: {customer.name}</h2>

        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xl font-semibold mb-3 text-gray-700">基本資訊</h4>
          <p><strong>客戶編號:</strong> {customer.customer_id}</p>
          <p><strong>聯絡人:</strong> {customer.contact_person}</p>
          <p><strong>電話:</strong> {customer.phone}</p>
          <p><strong>Email:</strong> {customer.email}</p>
        </div>

        <div className="mb-8 max-h-80 overflow-y-auto">
          <h4 className="text-xl font-semibold mb-3 text-gray-700">相關發票</h4>
          {invoices.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#C9C2B2] text-white">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">發票號碼</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">總金額</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">已付金額</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">尚未支付</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">開立日期</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">繳款截止日</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">分期數 (已付/預計)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount_paid?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {(inv.amount - inv.amount_paid)?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${inv.paid === '已付' ? 'bg-green-100 text-green-800' :
                            (inv.paid === '未付' || inv.paid === '逾期' || inv.paid === '部分付款' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                          {inv.paid}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.payments_count || 0} / {inv.total_installments || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有相關發票。</p>
          )}
        </div>

        <div className="mb-8 max-h-80 overflow-y-auto">
          <h4 className="text-xl font-semibold mb-3 text-gray-700">付款記錄</h4>
          {payments.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#C9C2B2] text-white">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">付款ID</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">付款日期</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">相關發票ID</th>
                    <th className="p-3 text-left text-sm font-semibold tracking-wider">專案</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map(pay => (
                    <tr key={pay.payment_id} className="hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.payment_id}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.payment_date}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {pay.amount?.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.method}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pay.status === '已付款' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.invoice_id || 'N/A'}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-800">{pay.project_name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有付款記錄。</p>
          )}
        </div>

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
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{p.invoice_id || 'N/A'}</td> {/* 顯示實際發票ID */}
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

// 零用金收支管理組件 (新增存入零用金按鈕)
function PettyCashTable({ transactions, onDepositClick, isManager }) {
  // 計算累計餘額
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
        {isManager && ( // 只有主管才能看到此按鈕
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

// 零用金存入彈窗
function DepositPettyCashModal({ onClose, onDepositSuccess }) {
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !depositDate) {
      setMessage('請輸入有效的存入金額和日期。');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        amount: parseFloat(amount),
        deposit_date: depositDate,
        notes: notes,
      };
      const res = await axios.post(`${API_URL}/api/finance/pettycash/deposit`, payload);
      setMessage(res.data.message || '零用金存入成功！');
      onDepositSuccess(); // 通知父組件刷新數據
    } catch (err) {
      console.error('存入零用金失敗:', err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.message || '存入零用金失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">存入零用金</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositAmount">
              存入金額 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="depositAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositDate">
              存入日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="depositDate"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depositNotes">
              備註 (可選)
            </label>
            <textarea
              id="depositNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#C9C2B2]"
            ></textarea>
          </div>

          {message && (
            <div className="text-center py-2 text-sm">
              <p className={message.includes('失敗') ? 'text-red-500' : 'text-green-500'}>{message}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
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
              {loading ? '提交中...' : '確認存入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 月報表組件 (新增匯出 PDF 按鈕)
function MonthlyReportTable({ reportData, monthlyReportRef, onExportPdf }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-[#C9C2B2]">每月財務報表</h3>
        <button
          onClick={onExportPdf}
          className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-md hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105"
        >
          匯出月報表 (PDF)
        </button>
      </div>
      {/* 使用 ref 綁定到要匯出的元素 */}
      <div ref={monthlyReportRef} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 p-4">
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


// 新增付款彈窗組件
function PaymentModal({ invoice, onClose, onPaymentSuccess }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 計算尚未支付的金額
  const outstandingAmount = (invoice.amount - invoice.amount_paid).toFixed(2);

  useEffect(() => {
    // 預設將付款金額設為尚未支付的金額
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
      onPaymentSuccess(); // 通知父組件刷新數據
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
