import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; 

import FinanceOverview from './FinanceOverview';
import InvoiceTable from './InvoiceTable';
import CustomerTable from './CustomerTable';
import PaymentTable from './PaymentTable';
import ExpenseTable from './ExpenseTable';
import PettyCashTable from './PettyCashTable';
import MonthlyReportTable from './MonthlyReportTable';

import AddExpenseModal from './modals/AddExpenseModal';
import PaymentModal from './modals/PaymentModal';
import DepositPettyCashModal from './modals/DepositPettyCashModal';
import OverviewDetailModal from './modals/OverviewDetailModal';
import CustomerDetailModal from './modals/CustomerDetailModal';


// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保這個 URL 正確指向您的後端伺服器

export default function FinancePage() {
  // 從 URL 參數獲取當前子路徑
  // useParams() 返回一個物件，其中包含路徑參數。
  // 我們在 App.jsx 中將路由定義為 path="finance/*"，
  // 這裡的 '*' 會捕獲 /finance/ 之後的所有內容。
  const { '*': subview } = useParams(); 
  const currentView = subview || 'overview'; // 如果沒有子路徑，預設顯示 'overview'

  const [overview, setOverview] = useState({ totalRevenue: 0, totalReceivables: 0, invoiceCount: 0, totalExpenses: 0 });
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState([]);
  const [monthlyReportData, setMonthlyReportData] = useState([]);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showPettyCashDepositModal, setShowPettyCashDepositModal] = useState(false);
  const [isManager, setIsManager] = useState(true); // 模擬主管權限

  const [showOverviewDetailModal, setShowOverviewDetailModal] = useState(false);
  const [overviewDetailType, setOverviewDetailType] = useState('');
  const [overviewDetailData, setOverviewDetailData] = useState([]);

  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);

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

    if (typeof window.jsPDF === 'undefined') {
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
    const fetchData = async () => {
      try {
        // 根據 currentView (從 URL 參數獲取) 獲取數據
        switch (currentView) { 
          case 'overview':
            await fetchOverview();
            await fetchMonthlyReport();
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
            await fetchCategories();
            await fetchVendors();
            await fetchProjects();
            await fetchExpenseAccounts();
            break;
          case 'pettyCash':
            await fetchPettyCash();
            break;
          case 'monthlyReport':
            await fetchMonthlyReport();
            break;
          default:
            await fetchOverview(); // 默認情況，例如遇到未知子路由
        }
      } catch (error) {
        console.error("Error fetching data for view:", currentView, error);
      }
    };

    fetchData();
  }, [currentView]); // 當 currentView 改變時，重新獲取數據


  // 各個資料獲取函數
  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/overview`);
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

  const handleExpenseAdded = () => {
    setShowAddExpenseModal(false);
    fetchExpenses();
    fetchOverview();
    fetchPettyCash();
    fetchMonthlyReport();
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    fetchInvoices();
    fetchOverview();
    fetchPayments();
    fetchPettyCash();
  };

  const handleInitiatePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleOverviewCardClick = async (type) => {
    setOverviewDetailType(type);
    let data = [];
    try {
      if (type === 'revenue') {
        data = monthlyReportData.map(item => ({
          month: item.month,
          amount: item.total_revenue,
          description: '總收入'
        }));
      } else if (type === 'expenses') {
        data = monthlyReportData.map(item => ({
          month: item.month,
          amount: item.total_expenses,
          description: '總支出'
        }));
      } else if (type === 'receivables') {
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
    }
  };

  const handleCustomerClick = async (customer) => {
    try {
      const res = await axios.get(`${API_URL}/api/finance/customers/${customer.customer_id}/details`);
      setSelectedCustomer(res.data);
      setShowCustomerDetailModal(true);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

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
    // FinancePage 現在只負責渲染內容，其樣式由 App.jsx 的 main 元素控制
    <div className="w-full h-full"> 
      {currentView === 'overview' && <FinanceOverview data={overview} monthlyReportData={monthlyReportData} onCardClick={handleOverviewCardClick} API_URL={API_URL} />}
      {currentView === 'invoices' && <InvoiceTable invoices={invoices} onInitiatePayment={handleInitiatePayment} API_URL={API_URL} />}
      {currentView === 'customers' && <CustomerTable customers={customers} onCustomerClick={handleCustomerClick} API_URL={API_URL} />}
      {currentView === 'payments' && <PaymentTable payments={payments} API_URL={API_URL} />}
      {currentView === 'expenses' && (
        <ExpenseTable
          expenses={expenses}
          onAddExpenseClick={() => setShowAddExpenseModal(true)}
          API_URL={API_URL}
        />
      )}
      {currentView === 'pettyCash' && <PettyCashTable transactions={pettyCashTransactions} onDepositClick={() => setShowPettyCashDepositModal(true)} isManager={isManager} API_URL={API_URL} />}
      {currentView === 'monthlyReport' && <MonthlyReportTable reportData={monthlyReportData} monthlyReportRef={monthlyReportRef} onExportPdf={exportMonthlyReportPdf} API_URL={API_URL} />}

      {showAddExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowAddExpenseModal(false)}
          onExpenseAdded={handleExpenseAdded}
          categories={categories}
          vendors={vendors}
          projects={projects}
          expenseAccounts={expenseAccounts}
          API_URL={API_URL}
        />
      )}

      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
          onPaymentSuccess={handlePaymentSuccess}
          API_URL={API_URL}
        />
      )}

      {showPettyCashDepositModal && (
        <DepositPettyCashModal
          onClose={() => setShowPettyCashDepositModal(false)}
          onDepositSuccess={() => { fetchPettyCash(); fetchOverview(); setShowPettyCashDepositModal(false); }}
          API_URL={API_URL}
        />
      )}

      {showOverviewDetailModal && (
        <OverviewDetailModal
          dataType={overviewDetailType}
          data={overviewDetailData}
          onClose={() => setShowOverviewDetailModal(false)}
          API_URL={API_URL}
        />
      )}

      {showCustomerDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customerData={selectedCustomer}
          onClose={() => setShowCustomerDetailModal(false)}
        />
      )}
    </div>
  );
}