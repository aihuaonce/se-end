import React, { useEffect, useState } from 'react'; // 引入 useState
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

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
import VendorPage from './ServicePages/VendorPage'; 
import CreateProjectForm from './ProjectPages/CreateProjectForm';
import ProjectAll from './ProjectPages/ProjectAll';
import ProjectDetailPage from './ProjectPages/ProjectDetailPage';
import ReservationsPage from "./pages/ReservationsPage";
import AdminChatPage from "./pages/AdminChatPage";
import LevelPage from "./pages/LevelPage";

import LoginModal from './modals/LoginModal';
import RegisterModal from './modals/RegisterModal';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 新增登入狀態
  const [showLoginModal, setShowLoginModal] = useState(false); // 控制登入模態框顯示
  const [showRegisterModal, setShowRegisterModal] = useState(false); // 控制註冊模態框顯示

  useEffect(() => {
    // 檢查 localStorage 中是否有 token，判斷是否已登入
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      // 如果未登入且不在登入/註冊頁面，則顯示登入模態框
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        setShowLoginModal(true);
      }
    }
  }, [location.pathname]); // 依賴 location.pathname 以在路徑改變時檢查

  useEffect(() => {
    if (location.pathname === '/finance' || location.pathname === '/finance/') {
      navigate('/finance/overview', { replace: true });
    }

    // 當用戶未登入且路徑不是根目錄、登入或註冊時，導向到首頁（並顯示登入）
    const publicPaths = ['/', '/login', '/register'];
    if (!isLoggedIn && !publicPaths.includes(location.pathname)) {
        navigate('/'); // 導向到首頁，然後會觸發顯示登入模態框
    }
  }, [location.pathname, navigate, isLoggedIn]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false); // 登入成功後關閉登入模態框
    navigate('/projectall'); // 登入成功後導向專案列表頁面
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/'); // 登出後導向首頁
    setShowLoginModal(true); // 顯示登入模態框
  };

  const handleCloseAuthModal = () => {
    // 如果登入狀態為 false 且關閉了模態框，則強制導向回首頁
    if (!isLoggedIn) {
      navigate('/');
      setShowLoginModal(false); // 確保模態框在關閉時狀態正確
      setShowRegisterModal(false);
    } else {
        // 如果已登入，則只是關閉模態框
        setShowLoginModal(false);
        setShowRegisterModal(false);
    }
  };

  const handleShowRegister = () => {
    setShowLoginModal(false); // 關閉登入模態框
    setShowRegisterModal(true); // 顯示註冊模態框
    navigate('/register', { replace: true }); // 更新 URL
  };

  const handleShowLogin = () => {
    setShowRegisterModal(false); // 關閉註冊模態框
    setShowLoginModal(true); // 顯示登入模態框
    navigate('/login', { replace: true }); // 更新 URL
  };

  return (
    <div className="flex flex-col h-screen"> 
      <Header onLogout={handleLogout} isLoggedIn={isLoggedIn} /> {/* 傳遞 onLogout 和 isLoggedIn */}
      <div className="flex flex-grow min-h-0">
        <Sidebar isLoggedIn={isLoggedIn} /> {/* 傳遞 isLoggedIn */}
        <main className="flex-grow bg-slate-100 overflow-x-hidden overflow-y-auto flex flex-col min-w-0">
          <div className="p-4 flex-grow min-h-0">
            <Outlet />
          </div>
        </main>
      </div>

      <Footer />

      {/* 條件渲染登入/註冊模態框 */}
      {showLoginModal && !isLoggedIn && (
        <LoginModal 
          onClose={handleCloseAuthModal} 
          onLoginSuccess={handleLoginSuccess} 
          onShowRegister={handleShowRegister} 
        />
      )}
      {showRegisterModal && !isLoggedIn && (
        <RegisterModal 
          onClose={handleCloseAuthModal} 
          onShowLogin={handleShowLogin} 
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 只將 AppLayout 作為根路由，其內部處理登入邏輯 */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} /> 
          <Route path="service" element={<ServicePageContent />} />
          <Route path="process" element={<DesignProcess />} />
          <Route path="/design-process/:id" element={<DesignProcessDetail />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="customer/:id" element={<CustomerDetails />} />
          <Route path="persondata" element={<PersonDataPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="finance/*" element={<FinancePage />} />
          <Route path="/vendor" element={<VendorPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/admin/chat" element={<AdminChatPage />} />
          <Route path="/level" element={<LevelPage />} /> 
          <Route path="/create-project/:planId" element={<CreateProjectForm />} />
          <Route path="/create-project" element={<CreateProjectForm />} />
          <Route path="projectall" element={<ProjectAll />} /> 
          <Route path="/projects/:id" element={<ProjectDetailPage />} /> 
          {/* 移除登入和註冊的獨立路由，因為它們現在由模態框控制 */}
          {/* <Route path="login" element={<div className="p-4 text-center text-gray-500">登入頁面背景內容...</div>} /> */}
          {/* <Route path="register" element={<div className="p-4 text-center text-gray-500">註冊頁面背景內容...</div>} /> */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;