// src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

// 導入所有頁面和組件
import HomePage from './pages/HomePages';
import ServicePageContent from './ServicePages/ServicePage';
import DesignProcess from './ServicePages/DesignProcess';
import DesignProcessDetail from './ServicePages/DesignProcessDetail';
import CustomerPage from './pages/CustomerPage';
import FinancePage from './FinancePage/FinancePage';
import NotFoundPage from './pages/NotFoundPage';
import CustomerDetails from './ServicePages/CustomerDetail';
import PersonDataPage from "./pages/PersonDataPage";
import BookingPage from "./pages/BookingPage";
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import GuestWallFromSheet from './pages/GuestWallFromSheet.jsx'; // <-- 新增：導入 AI 分身牆頁面

import LoginModal from './modals/LoginModal';
import RegisterModal from './modals/RegisterModal';

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
          <Route path="process/:id" element={<DesignProcessDetail />} /> {/* AI流程設計詳情 */}
          <Route path="customer" element={<CustomerPage />} /> {/* 聯絡 */}
          <Route path="customer/:id" element={<CustomerDetails />} /> {/* 溝通 (假設這是客戶詳情) */}
          <Route path="persondata" element={<PersonDataPage />} /> {/* 個人資料 */}
          <Route path="booking" element={<BookingPage />} /> {/* 預約 */}
          
          {/* 財務頁面嵌套路由 */}
          <Route path="finance/*" element={<FinancePage />} /> {/* 使用 * 匹配所有 finance 子路徑 */}

          {/* 新增：AI 分身牆頁面路由 */}
          <Route path="guestwall" element={<GuestWallFromSheet />} /> {/* <-- 新增這一行 */}

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
