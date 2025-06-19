// src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
// 請務必確認此檔案存在於 src/App.css，且路徑與大小寫完全匹配。
import './App.css';

// 導入所有頁面和組件
// 請務必仔細檢查這些路徑與您實際的檔案結構相符，特別是檔案名稱的拼寫與大小寫，
// 以及確切的副檔名是 .js 還是 .jsx。
// 這裡預設使用 .jsx 副檔名，如果您的檔案是 .js，請務必手動修改。

import HomePage from './pages/HomePages.jsx';
import ServicePageContent from './ServicePages/ServicePage.jsx';
import DesignProcess from './ServicePages/DesignProcess.jsx';
import DesignProcessDetail from './ServicePages/DesignProcessDetail.jsx';
import CustomerPage from './pages/CustomerPage.jsx';
import FinancePage from './FinancePage/FinancePage.jsx'; // 再次確認 FinancePage 資料夾下的 FinancePage.jsx
import NotFoundPage from './pages/NotFoundPage.jsx';
import CustomerDetails from './ServicePages/CustomerDetail.jsx';
import PersonDataPage from "./pages/PersonDataPage.jsx";
import BookingPage from "./pages/BookingPage.jsx";

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Sidebar from './components/Sidebar.jsx';

// 根據您的指示，暫時不導入 VendorPage, ProjectAll, ProjectDetailPage

// 導入 AI 分身牆頁面
// 請確認此檔案是否存在於 pages 資料夾中且副檔名為 .jsx (或 .js)
import GuestWallFromSheet from './pages/GuestWallFromSheet.jsx';

import LoginModal from './modals/LoginModal.jsx';
import RegisterModal from './modals/RegisterModal.jsx';

// AppLayout 組件，包含 Header, Sidebar, Footer 和主內容區域
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 當路徑是 /finance 或 /finance/ 時，導航到 /finance/overview
    if (location.pathname === '/finance' || location.pathname === '/finance/') {
      navigate('/finance/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  const handleCloseAuthModal = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-grow min-h-0">
        <Sidebar />
        <main className="flex-grow bg-slate-100 overflow-x-hidden overflow-y-auto flex flex-col min-w-0">
          <div className="p-4 flex-grow min-h-0">
            <Outlet /> {/* Outlet 用於渲染嵌套路由的子組件 */}
          </div>
        </main>
      </div>

      <Footer />

      {/* 模態框根據路徑條件渲染 */}
      {isLoginPage && <LoginModal onClose={handleCloseAuthModal} />}
      {isRegisterPage && <RegisterModal onClose={handleCloseAuthModal} />}
    </div>
  );
}

// App 組件，設定主要的路由結構
function App() {
  return (
    <Router>
      <Routes>
        {/* 所有的主要應用程式頁面都將在 AppLayout 中渲染 */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} /> {/* 首頁 */}
          <Route path="service" element={<ServicePageContent />} /> {/* 自動化賀卡寄送 */}
          <Route path="process" element={<DesignProcess />} /> {/* AI流程設計 */}
          {/* 注意：這裡將 DesignProcessDetail 的路徑從 ':id' 改為 '/design-process/:id'
              這是為了避免與 'process' 直接衝突，並提供更明確的層次結構。
              如果您的原意是 'process/123' 這樣的路徑，請將此路徑改回 'process/:id'。
              然而，通常設計詳情頁面會使用更具描述性的路徑。 */}
          <Route path="/design-process/:id" element={<DesignProcessDetail />} /> {/* AI流程設計詳情 */}
          <Route path="customer" element={<CustomerPage />} /> {/* 聯絡 */}
          <Route path="customer/:id" element={<CustomerDetails />} /> {/* 溝通 (假設這是客戶詳情) */}
          <Route path="persondata" element={<PersonDataPage />} /> {/* 個人資料 */}
          <Route path="booking" element={<BookingPage />} /> {/* 預約 */}

          {/* 財務頁面嵌套路由 */}
          <Route path="finance/*" element={<FinancePage />} /> {/* 使用 * 匹配所有 finance 子路徑 */}

          {/* 根據您的指示，暫時不包含 VendorPage, ProjectAll, ProjectDetailPage 的路由 */}
          {/* <Route path="/vendor" element={<VendorPage />} /> */}
          {/* <Route path="projects" element={<ProjectAll />} /> */}
          {/* <Route path="/projects/:id" element={<ProjectDetailPage />} /> */}

          {/* AI 分身牆頁面路由 */}
          <Route path="guestwall" element={<GuestWallFromSheet />} />

          {/* 登入和註冊頁面 (作為背景內容的佔位符，實際模態框由 AppLayout 管理) */}
          <Route path="login" element={<div className="p-4 text-center text-gray-500">登入頁面背景內容...</div>} />
          <Route path="register" element={<div className="p-4 text-center text-gray-500">註冊頁面背景內容...</div>} />

          {/* 404 Not Found 頁面，匹配所有未定義的路徑 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
