import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar // Import RadarChart components
} from 'recharts';

// Define the backend API URL
const API_URL = 'http://localhost:5713/api/finance'; // Ensure this URL points to your backend server

export default function FinancePage() {
  const [view, setView] = useState('overview');
  // Overview data state, updating totalReceivables
  const [overview, setOverview] = useState({ totalRevenue: 0, totalReceivables: 0, invoiceCount: 0, totalExpenses: 0 });
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState([]);
  const [monthlyReportData, setMonthlyReportData] = useState([]); // Monthly report data state (revenue/expense trends)

  // New chart data states
  const [expenseByCategoryData, setExpenseByCategoryData] = useState([]); // Expense category distribution data
  const [revenueByProjectData, setRevenueByProjectData] = useState([]); // Project revenue distribution data
  const [invoicePaymentMethodData, setInvoicePaymentMethodData] = useState([]); // New: Invoice Payment Method Distribution
  const [invoiceStatusData, setInvoiceStatusData] = useState([]); // New: Invoice Status Distribution
  const [topCustomersData, setTopCustomersData] = useState([]); // New: Top Customers by Revenue Data

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); // Control add expense modal display
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Control payment modal display
  const [selectedInvoice, setSelectedInvoice] = useState(null); // Store selected invoice

  const [showPettyCashDepositModal, setShowPettyCashDepositModal] = useState(false); // Petty cash deposit modal
  const [isManager, setIsManager] = useState(true); // Simulate manager access, should come from auth system in real app

  const [showOverviewDetailModal, setShowOverviewDetailModal] = useState(false); // Overview detail modal
  const [overviewDetailType, setOverviewDetailType] = useState(''); // Overview detail type (revenue, expenses, receivables, invoices)
  const [overviewDetailData, setOverviewDetailData] = useState([]); // Overview detail data

  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false); // Customer detail modal
  const [selectedCustomer, setSelectedCustomer] = useState(null); // Store selected customer

  // Data states for various dropdowns
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]); // New expense accounts state

  // Ref for monthly report PDF export
  const monthlyReportRef = useRef(null);

  // Dynamically load jsPDF and html2canvas libraries
  useEffect(() => {
    const loadScript = (src, id, callback) => {
      if (document.getElementById(id)) {
        if (id === 'jspdf-script' && (typeof window.jsPDF !== 'undefined' || typeof window.jspdf !== 'undefined')) {
          if (callback) callback();
          return;
        }
        if (id === 'html2canvas-script' && typeof window.html2canvas !== 'undefined') {
          if (callback) callback();
          return;
        }
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

    if (typeof window.jsPDF === 'undefined' && typeof window.jspdf === 'undefined') {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
          window.jsPDF = window.jspdf.jsPDF;
        } else if (typeof window.jspdf !== 'undefined') {
          window.jsPDF = window.jspdf;
        }
      });
    }

    if (typeof window.html2canvas === 'undefined') {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script');
    }
  }, []);


  useEffect(() => {
    // Fetch data based on current view
    const fetchData = async () => {
      try {
        switch (view) {
          case 'overview':
            await fetchOverview();
            await fetchMonthlyReport(); // Overview page also needs monthly report data for charts
            await fetchExpenseByCategory(); // Fetch new chart data
            await fetchRevenueByProject();  // Fetch new chart data
            await fetchInvoicePaymentMethods(); // Fetch new payment method data
            await fetchInvoiceStatus(); // Fetch new invoice status data
            await fetchTopCustomers(); // Fetch new top customers data
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
            // Preload dropdown data when switching to expense management
            await fetchCategories();
            await fetchVendors();
            await fetchProjects();
            await fetchExpenseAccounts(); // Load expense accounts
            break;
          case 'pettyCash':
            await fetchPettyCash();
            break;
          case 'monthlyReport': // New monthly report view
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

  // Data fetching functions
  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/overview`);
      setOverview({
        totalRevenue: res.data.totalRevenue,
        totalReceivables: res.data.totalReceivables,
        invoiceCount: res.data.invoiceCount,
        totalExpenses: res.data.totalExpenses
      });
    } catch (err) {
      console.error('Fetch overview error:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API_URL}/invoices`);
      setInvoices(res.data);
    } catch (err) {
      console.error('Fetch invoices error:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Fetch customers error:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/payments`);
      setPayments(res.data);
    } catch (err) {
      console.error('Fetch payments error:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      setExpenses(res.data);
    } catch (err) {
      console.error('Fetch expenses error:', err);
    }
  };

  const fetchPettyCash = async () => {
    try {
      const res = await axios.get(`${API_URL}/pettycash`);
      setPettyCashTransactions(res.data);
    } catch (err) {
      console.error('Fetch petty cash error:', err);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      const res = await axios.get(`${API_URL}/monthly-report`);
      setMonthlyReportData(res.data);
    } catch (err) {
      console.error('Fetch monthly report error:', err);
    }
  };

  const fetchExpenseByCategory = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses-by-category`); // New backend route
      setExpenseByCategoryData(res.data);
    } catch (err) {
      console.error('Fetch expense by category error:', err);
    }
  };

  const fetchRevenueByProject = async () => {
    try {
      const res = await axios.get(`${API_URL}/revenue-by-project`); // New backend route
      setRevenueByProjectData(res.data);
    } catch (err) {
      console.error('Fetch revenue by project error:', err);
    }
  };

  // New: Fetch invoice payment method distribution
  const fetchInvoicePaymentMethods = async () => {
    try {
      const res = await axios.get(`${API_URL}/invoice-payment-methods`); // New backend route needed
      setInvoicePaymentMethodData(res.data);
    } catch (err) {
      console.error('Fetch invoice payment methods error:', err);
    }
  };

  // New: Fetch invoice status distribution
  const fetchInvoiceStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/invoice-status-distribution`); // New backend route needed
      setInvoiceStatusData(res.data);
    } catch (err) {
      console.error('Fetch invoice status error:', err);
    }
  };

  // New: Fetch top customers by revenue
  const fetchTopCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/top-customers-by-revenue?limit=5`); // Fetch top 5
      setTopCustomersData(res.data);
    } catch (err) {
      console.error('Fetch top customers by revenue error:', err);
    }
  };

  // Functions to fetch dropdown data
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/vendors`);
      setVendors(res.data);
    } catch (err) {
      console.error('Fetch vendors error:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_URL}/projects`);
      setProjects(res.data);
    } catch (err) {
      console.error('Fetch projects error:', err);
    }
  };

  const fetchExpenseAccounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/accounts/expenses`);
      setExpenseAccounts(res.data);
    } catch (err) {
      console.error('Fetch expense accounts error:', err);
    }
  };


  // Callback function after adding expense successfully
  const handleExpenseAdded = () => {
    setShowAddExpenseModal(false); // Close modal
    fetchExpenses(); // Refresh expense list
    fetchOverview(); // Refresh overview data (update total expenses)
    fetchPettyCash(); // Refresh petty cash data (if payment method affects cash account)
    fetchMonthlyReport(); // Refresh monthly report (as expenses might have been added)
    fetchExpenseByCategory(); // Refresh expense category chart
  };

  // Callback for successful payment
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false); // Close payment modal
    setSelectedInvoice(null); // Clear selected invoice
    fetchInvoices(); // Refresh invoice list
    fetchOverview(); // Refresh overview data (update receivables)
    fetchPayments(); // Refresh payment records
    fetchPettyCash(); // Refresh petty cash (if payment method affects cash account)
    fetchRevenueByProject(); // Refresh project revenue chart
    fetchInvoicePaymentMethods(); // Refresh payment method chart
    fetchInvoiceStatus(); // Refresh invoice status chart
    fetchTopCustomers(); // Refresh top customers chart
  };

  // Handle click on payment button
  const handleInitiatePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  // Handle overview card click to show details
  const handleOverviewCardClick = async (type) => {
    setOverviewDetailType(type);
    let data = [];
    try {
      if (type === 'revenue') {
        data = monthlyReportData.map(item => ({
          month: item.month,
          amount: item.total_revenue,
          description: 'Total Revenue' // 總收入
        }));
      } else if (type === 'expenses') {
        data = monthlyReportData.map(item => ({
          month: item.month,
          amount: item.total_expenses,
          description: 'Total Expenses' // 總支出
        }));
      } else if (type === 'receivables') {
        const res = await axios.get(`${API_URL}/invoices`);
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
        const res = await axios.get(`${API_URL}/invoices`);
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
    }
  };

  // Handle customer click to show customer details
  const handleCustomerClick = async (customer) => {
    try {
      const res = await axios.get(`${API_URL}/customers/${customer.customer_id}/details`);
      setSelectedCustomer(res.data);
      setShowCustomerDetailModal(true);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  // Export monthly report to PDF
  const exportMonthlyReportPdf = async () => {
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
      console.error("PDF export libraries not loaded yet.");
      alert("PDF 匯出功能尚未載入，請稍後再試。");
      return;
    }

    if (monthlyReportRef.current) {
      const input = monthlyReportRef.current;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      window.html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
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
      {/* Side navigation bar */}
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
              className={`block w-full text-left py-2 px-4 rounded-full transition duration-300 ease-in-out
                ${view === item.key ? 'bg-white text-[#C9C2B2] font-semibold shadow-md' : 'hover:bg-[#B7B09F] hover:text-white'}`}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 bg-gray-100 p-8">
        {view === 'overview' && (
          <FinanceOverview
            data={overview}
            monthlyReportData={monthlyReportData}
            expenseByCategoryData={expenseByCategoryData} // Pass new data
            revenueByProjectData={revenueByProjectData}    // Pass new data
            invoicePaymentMethodData={invoicePaymentMethodData} // New prop
            invoiceStatusData={invoiceStatusData} // New prop
            topCustomersData={topCustomersData} // New prop
            onCardClick={handleOverviewCardClick}
          />
        )}
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

      {/* Add Expense Modal */}
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

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Petty Cash Deposit Modal */}
      {showPettyCashDepositModal && (
        <DepositPettyCashModal
          onClose={() => setShowPettyCashDepositModal(false)}
          onDepositSuccess={() => { fetchPettyCash(); fetchOverview(); setShowPettyCashDepositModal(false); }}
        />
      )}

      {/* Overview Detail Modal */}
      {showOverviewDetailModal && (
        <OverviewDetailModal
          dataType={overviewDetailType}
          data={overviewDetailData}
          onClose={() => setShowOverviewDetailModal(false)}
        />
      )}

      {/* Customer Detail Modal */}
      {showCustomerDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customerData={selectedCustomer}
          onClose={() => setShowCustomerDetailModal(false)}
        />
      )}
    </div>
  );
}

// Financial Overview Component (updates overview cards and adds charts)
function FinanceOverview({ data, monthlyReportData, expenseByCategoryData, revenueByProjectData, invoicePaymentMethodData, invoiceStatusData, topCustomersData, onCardClick }) {
  // Chart colors for various charts
  const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1942', '#8B008B', '#00FFFF'];

  // Map payment method data to fit RadarChart requirements (each method is a dimension)
  const radarChartData = invoicePaymentMethodData.map(item => ({
    method: item.method,
    amount: item.total_amount,
  }));

  // Find the maximum amount for the PolarRadiusAxis domain
  const maxAmount = radarChartData.length > 0 ? Math.max(...radarChartData.map(item => item.amount)) * 1.1 : 100; // Add 10% buffer, default to 100 if no data

  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">財務概覽</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard label="總營收" value={data.totalRevenue} onClick={() => onCardClick('revenue')} />
        <OverviewCard label="總支出" value={data.totalExpenses} onClick={() => onCardClick('expenses')} />
        <OverviewCard label="代收款" value={data.totalReceivables} onClick={() => onCardClick('receivables')} />
        <OverviewCard label="發票總數" value={data.invoiceCount} onClick={() => onCardClick('invoiceCount')} />
      </div>

      {/* Monthly Financial Trend Chart */}
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

      {/* New report charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"> {/* Adjusted grid layout */}
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

        {/* Updated: Payment Method Distribution Chart (Radar Chart) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h5 className="text-xl font-semibold mb-4 text-gray-700">付款方式分佈圖</h5>
          {radarChartData && radarChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="method" />
                <PolarRadiusAxis angle={30} domain={[0, maxAmount]} /> {/* Dynamic domain */}
                <Radar name="總金額" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip formatter={(value) => `NT$ ${value.toLocaleString()}`} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="p-4 text-center text-gray-500">沒有足夠的付款方式數據來顯示圖表。</p>
          )}
        </div>

        {/* New: Invoice Status Distribution Chart */}
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

      {/* New Row for Top Customers Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* New grid for additional charts */}
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

// Overview Detail Modal
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.month}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {item.amount?.toLocaleString()}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.customer}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {item.amount?.toLocaleString()}</td>
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


// Invoice Table Component (added company name, contact person name, payment button, print button text modified)
function InvoiceTable({ invoices, onInitiatePayment }) {
  const handlePrintInvoice = async (invoice) => {
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
      console.error("PDF export libraries not loaded yet.");
      alert("PDF 匯出功能尚未載入，請稍後再試。");
      return;
    }

    const invoiceContent = `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; background-color: white;">
        <h1 style="text-align: center; color: #C9C2B2; margin-bottom: 20px;">發票 #${invoice.id}</h1>
        <div style="margin-bottom: 20px;">
          <p><strong>公司名稱:</strong> 小高婚慶</p> <!-- Fixed company name -->
          <p><strong>客戶名稱:</strong> ${invoice.customer_company_name}</p>
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
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer_company_name}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer_contact_person || 'N/A'}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount_paid?.toLocaleString()}</td><td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${inv.paid === '已付' ? 'bg-green-100 text-green-800' :
                        inv.paid === '部分付款' ? 'bg-yellow-100 text-yellow-800' :
                        inv.paid === '逾期' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {inv.paid}
                    </span>
                  </td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.total_installments}</td><td className="p-3 whitespace-nowrap text-sm font-medium flex space-x-2 justify-center">
                    {/* 只有在發票未完全付款時才顯示付款按鈕 */}
                    {inv.paid !== '已付' && (
                      <button
                        onClick={() => onInitiatePayment(inv)}
                        className="px-4 py-2 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
                      >
                        付款
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintInvoice(inv)}
                      className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition duration-300 ease-in-out shadow-md"
                    >
                      列印發票
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

// Customer Table Component
function CustomerTable({ customers, onCustomerClick }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">客戶管理</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">客戶ID</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">公司名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人姓名</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">聯絡電話</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">電子郵件</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length > 0 ? (
              customers.map(customer => (
                <tr key={customer.customer_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{customer.customer_id}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{customer.name}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{customer.contact_person}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{customer.phone}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{customer.email}</td><td className="p-3 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() => onCustomerClick(customer)}
                      className="px-4 py-2 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
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

// Customer Detail Modal
function CustomerDetailModal({ customerData, onClose }) {
  if (!customerData) return null;

  const { customer, invoices, payments } = customerData;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">客戶詳情: {customer.name}</h2>

        {/* Customer Info */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold mb-3 text-gray-700">基本資訊</h3>
          <p><strong>負責人:</strong> {customer.contact_person}</p>
          <p><strong>電話:</strong> {customer.phone}</p>
          <p><strong>電子郵件:</strong> {customer.email}</p>
          <p><strong>地址:</strong> {customer.address || 'N/A'}</p>
        </div>

        {/* Invoices */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-700">相關發票 ({invoices.length} 張)</h3>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">發票號碼</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">開立日期</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">總金額</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">已付金額</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">分期/已付次數</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.issueDate}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {inv.amount?.toLocaleString()}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {inv.amount_paid?.toLocaleString()}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.paid}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{inv.payments_count || 0} / {inv.total_installments || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500">沒有相關發票。</p>
          )}
        </div>

        {/* Payments */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-700">付款記錄 ({payments.length} 筆)</h3>
          {payments.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">付款ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">方式</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">對應發票</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">專案</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map(payment => (
                    <tr key={payment.payment_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.payment_id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.payment_date}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">NT$ {payment.amount?.toLocaleString()}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.method}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.invoice_id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.project_name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500">沒有付款記錄。</p>
          )}
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


// Payment Table Component
function PaymentTable({ payments }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">付款紀錄</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">付款ID</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">客戶名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">對應發票</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">方式</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">狀態</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length > 0 ? (
              payments.map(payment => (
                <tr key={payment.payment_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{payment.payment_id}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{payment.customer_name}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{payment.invoice_id}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{payment.project_name || 'N/A'}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{payment.payment_date}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {payment.amount?.toLocaleString()}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{payment.method}</td><td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${payment.status === '已付款' ? 'bg-green-100 text-green-800' :
                        payment.status === '處理中' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">沒有付款紀錄。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Expense Table Component
function ExpenseTable({ expenses, onAddExpenseClick }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">支出管理</h3>
      <div className="mb-4 flex justify-end">
        <button
          onClick={onAddExpenseClick}
          className="px-6 py-3 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-lg text-lg font-semibold"
        >
          新增支出
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">支出ID</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">專案名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">供應商</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">分類</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">描述</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">付款方式</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">會計科目</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tr-lg">負責人</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length > 0 ? (
              expenses.map(exp => (
                <tr key={exp.expense_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.expense_id}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.project_name || 'N/A'}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.vendor_name || 'N/A'}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.category_name || 'N/A'}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.description}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {exp.amount?.toLocaleString()}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.expense_date}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.payment_method}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.accounting_account_name}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{exp.responsible_person || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-500">沒有支出數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Add Expense Modal Component
function AddExpenseModal({ onClose, onExpenseAdded, categories, vendors, projects, expenseAccounts }) {
  const [formData, setFormData] = useState({
    project_id: '',
    vendor_id: '',
    category_id: '',
    expense_item_description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0], // Default to current date
    vendor_invoice_number: '',
    payment_method: '',
    notes: '',
    responsible_person: '',
    accounting_account_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic client-side validation
    if (!formData.expense_item_description || !formData.amount || parseFloat(formData.amount) <= 0 ||
        !formData.expense_date || !formData.category_id || !formData.payment_method || !formData.accounting_account_id) {
      setError('請填寫所有標示為必填的欄位，並確保金額和選擇有效。');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/expenses`, formData);
      setSuccess(res.data.message);
      onExpenseAdded(); // Trigger refresh on parent component
    } catch (err) {
      console.error('Failed to add expense:', err);
      setError(err.response?.data?.message || '新增支出失敗，請檢查輸入或聯繫管理員。');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl transform scale-100 transition-transform duration-300 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">新增支出</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="expense_item_description" className="block text-gray-700 text-sm font-bold mb-2">支出描述 <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="expense_item_description"
              name="expense_item_description"
              value={formData.expense_item_description}
              onChange={handleChange}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">金額 (NT$) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="expense_date" className="block text-gray-700 text-sm font-bold mb-2">支出日期 <span className="text-red-500">*</span></label>
            <input
              type="date"
              id="expense_date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div>
            <label htmlFor="category_id" className="block text-gray-700 text-sm font-bold mb-2">支出分類 <span className="text-red-500">*</span></label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="shadow border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">請選擇分類</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-gray-700 text-sm font-bold mb-2">付款方式 <span className="text-red-500">*</span></label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="shadow border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">請選擇方式</option>
              <option value="現金">現金</option>
              <option value="銀行轉帳">銀行轉帳</option>
              <option value="信用卡">信用卡</option>
              <option value="支票">支票</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label htmlFor="accounting_account_id" className="block text-gray-700 text-sm font-bold mb-2">會計科目 <span className="text-red-500">*</span></label>
            <select
              id="accounting_account_id"
              name="accounting_account_id"
              value={formData.accounting_account_id}
              onChange={handleChange}
              className="shadow border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">請選擇會計科目</option>
              {expenseAccounts.map(account => (
                <option key={account.account_id} value={account.account_id}>{account.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project_id" className="block text-gray-700 text-sm font-bold mb-2">專案 (可選)</label>
            <select
              id="project_id"
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              className="shadow border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">無專案</option>
              {projects.map(proj => (
                <option key={proj.project_id} value={proj.project_id}>{proj.project_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vendor_id" className="block text-gray-700 text-sm font-bold mb-2">供應商 (可選)</label>
            <select
              id="vendor_id"
              name="vendor_id"
              value={formData.vendor_id}
              onChange={handleChange}
              className="shadow border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">無供應商</option>
              {vendors.map(vendor => (
                <option key={vendor.vendor_id} value={vendor.vendor_id}>{vendor.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vendor_invoice_number" className="block text-gray-700 text-sm font-bold mb-2">供應商發票號碼 (可選)</label>
            <input
              type="text"
              id="vendor_invoice_number"
              name="vendor_invoice_number"
              value={formData.vendor_invoice_number}
              onChange={handleChange}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div>
            <label htmlFor="responsible_person" className="block text-gray-700 text-sm font-bold mb-2">負責人 (可選)</label>
            <input
              type="text"
              id="responsible_person"
              name="responsible_person"
              value={formData.responsible_person}
              onChange={handleChange}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">備註 (可選)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            ></textarea> {/* This was the missing closing tag */}
          </div>

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
              className="px-6 py-2 bg-[#C9C2B2] text-white rounded-full font-semibold hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
            >
              新增支出
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Payment Modal Component
function PaymentModal({ invoice, onClose, onPaymentSuccess }) {
  const [paymentAmount, setPaymentAmount] = useState(invoice.amount - invoice.amount_paid);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to generate a random QR code URL (placeholder)
  const generateQRCodeUrl = (data) => {
    // In a real application, you would use a QR code generation library or API
    // This is a placeholder for demonstration purposes
    return `https://placehold.co/150x150/000000/FFFFFF/png?text=QR+Code+for+${encodeURIComponent(data)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paymentAmount || parseFloat(paymentAmount) <= 0 || !paymentMethod || !paymentDate) {
      setError('請填寫所有必填欄位，並確保付款金額有效。');
      return;
    }
    if (parseFloat(paymentAmount) > (invoice.amount - invoice.amount_paid)) {
      setError('付款金額不能超過剩餘應付金額。');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/process-payment`, {
        invoiceId: invoice.id,
        paymentAmount: parseFloat(paymentAmount),
        paymentMethod,
        paymentDate
      });
      setSuccess(res.data.message);
      onPaymentSuccess(); // Refresh data in parent
    } catch (err) {
      console.error('Failed to process payment:', err);
      setError(err.response?.data?.message || '處理付款失敗，請重試或聯繫管理員。');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">處理付款</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</div>}
        <div className="mb-4">
          <p><strong>發票號碼:</strong> {invoice.id}</p>
          <p><strong>客戶:</strong> {invoice.customer_company_name}</p>
          <p><strong>總金額:</strong> NT$ {invoice.amount?.toLocaleString()}</p>
          <p><strong>已付金額:</strong> NT$ {invoice.amount_paid?.toLocaleString()}</p>
          <p className="text-lg font-semibold"><strong>剩餘應付:</strong> NT$ ${(invoice.amount - invoice.amount_paid).toLocaleString()}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="paymentAmount" className="block text-gray-700 text-sm font-bold mb-2">付款金額 <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="paymentAmount"
              name="paymentAmount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              step="0.01"
              required
              max={invoice.amount - invoice.amount_paid} // Max value to prevent overpayment
            />
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-gray-700 text-sm font-bold mb-2">付款方式 <span className="text-red-500">*</span></label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="shadow border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">請選擇方式</option>
              <option value="現金">現金</option>
              <option value="銀行轉帳">銀行轉帳</option>
              <option value="信用卡">信用卡</option>
              <option value="線上付款">線上付款</option>
            </select>
          </div>
          {/* Display QR code for Credit Card or Online Payment */}
          {(paymentMethod === '信用卡' || paymentMethod === '線上付款') && paymentAmount > 0 && (
            <div className="flex flex-col items-center mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 font-semibold mb-2">請掃描 QR Code 完成支付：</p>
              <img
                src={generateQRCodeUrl(`Invoice ID: ${invoice.id}, Amount: ${paymentAmount}, Method: ${paymentMethod}`)}
                alt="Payment QR Code"
                className="w-40 h-40 border border-gray-300 rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-2">（此為模擬 QR Code）</p>
            </div>
          )}
          <div>
            <label htmlFor="paymentDate" className="block text-gray-700 text-sm font-bold mb-2">付款日期 <span className="text-red-500">*</span></label>
            <input
              type="date"
              id="paymentDate"
              name="paymentDate"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
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
              className="px-6 py-2 bg-[#C9C2B2] text-white rounded-full font-semibold hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
            >
              確認付款
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Petty Cash Table Component
function PettyCashTable({ transactions, onDepositClick, isManager }) {
  // Calculate current balance
  const currentBalance = transactions.reduce((acc, curr) => {
    return acc + (curr.debit_amount || 0) - (curr.credit_amount || 0);
  }, 0);

  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">零用金收支管理</h3>
      <div className="mb-4 flex justify-between items-center">
        <h4 className="text-2xl font-bold text-gray-700">當前餘額: NT$ {currentBalance.toLocaleString()}</h4>
        {isManager && (
          <button
            onClick={onDepositClick}
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
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">交易日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">描述</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">借方金額 (入)</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider rounded-tr-lg">貸方金額 (出)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length > 0 ? (
              transactions.map(t => (
                <tr key={t.line_id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.entry_date}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800">{t.description}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {t.debit_amount?.toLocaleString()}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {t.credit_amount?.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">沒有零用金交易紀錄。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Deposit Petty Cash Modal Component
function DepositPettyCashModal({ onClose, onDepositSuccess }) {
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || parseFloat(amount) <= 0 || !depositDate) {
      setError('請提供有效的存入金額和日期。');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/pettycash/deposit`, {
        amount: parseFloat(amount),
        deposit_date: depositDate,
        notes
      });
      setSuccess(res.data.message);
      onDepositSuccess();
    } catch (err) {
      console.error('Failed to deposit petty cash:', err);
      setError(err.response?.data?.message || '存入零用金失敗，請重試或聯繫管理員。');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-[#C9C2B2] text-center">存入零用金</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="depositAmount" className="block text-gray-700 text-sm font-bold mb-2">存入金額 (NT$) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="depositAmount"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              step="0.01"
              required
            />
          </div>
          <div>
            <label htmlFor="depositDate" className="block text-gray-700 text-sm font-bold mb-2">存入日期 <span className="text-red-500">*</span></label>
            <input
              type="date"
              id="depositDate"
              name="deposit_date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="shadow appearance-none border rounded-full w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">備註 (可選)</label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            ></textarea>
          </div>
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
              className="px-6 py-2 bg-[#C9C2B2] text-white rounded-full font-semibold hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-md"
            >
              確認存入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Monthly Report Table Component
function MonthlyReportTable({ reportData, monthlyReportRef, onExportPdf }) {
  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">月報表</h3>
      <div className="mb-4 flex justify-end">
        <button
          onClick={onExportPdf}
          className="px-6 py-3 bg-[#8B806E] text-white rounded-full hover:bg-[#A99A80] transition duration-300 ease-in-out shadow-lg text-lg font-semibold"
        >
          匯出為 PDF
        </button>
      </div>
      <div ref={monthlyReportRef} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 p-6">
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
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{row.month}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {row.total_revenue?.toLocaleString()}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {row.total_expenses?.toLocaleString()}</td><td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {row.net_profit_loss?.toLocaleString()}</td>
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
