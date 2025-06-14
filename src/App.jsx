import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

import HomePage from './pages/HomePages';
import ServicePageContent from './ServicePages/ServicePage';
import DesignProcess from './ServicePages/DesignProcess';
import CustomerPage from './pages/CustomerPage';
import FinancePage from './FinancePage/FinancePage'; // 確保路徑正確
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import CustomerDetails from './ServicePages/CustomerDetail';
import RegisterPage from './pages/RegisterPage';
import PersonDataPage from "./pages/PersonDataPage";
import BookingPage from "./pages/BookingPage";
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // 導航到 /finance 時，自動重定向到 /finance/overview
  useEffect(() => {
    if (location.pathname === '/finance' || location.pathname === '/finance/') {
      navigate('/finance/overview', { replace: true });
    }
  }, [location.pathname, navigate]);


  // 檢查是否是登入或註冊頁面，這些頁面不需要 Sidebar 和 Header/Footer
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    // 這些頁面直接渲染，不包含佈局
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header /> 

      <div className="flex flex-grow">
        <Sidebar />
        <main className="flex-grow overflow-y-auto bg-white"> 
          <div className="p-2 h-full"> 
            <Outlet />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} /> 
          <Route path="service" element={<ServicePageContent />} />
          <Route path="process" element={<DesignProcess />} />
          <Route path="customer" element={<CustomerPage />} />
          <Route path="customer/:id" element={<CustomerDetails />} />
          <Route path="persondata" element={<PersonDataPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="finance/*" element={<FinancePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

      </Routes>
    </Router>
  );
}

export default App;