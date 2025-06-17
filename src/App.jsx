import React, { useEffect } from 'react';
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

import ProjectAll from './ProjectPages/ProjectAll';


import LoginModal from './modals/LoginModal';
import RegisterModal from './modals/RegisterModal';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
            <Outlet />
          </div>
        </main>
      </div>

      <Footer />

      {isLoginPage && <LoginModal onClose={handleCloseAuthModal} />}
      {isRegisterPage && <RegisterModal onClose={handleCloseAuthModal} />}
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
          <Route path="process/:id" element={<DesignProcessDetail />} />
          <Route path="customer" element={<CustomerPage />} />
          <Route path="customer/:id" element={<CustomerDetails />} />
          <Route path="persondata" element={<PersonDataPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="finance/*" element={<FinancePage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="login" element={<div className="p-4 text-center text-gray-500">登入頁面背景內容...</div>} />
          <Route path="register" element={<div className="p-4 text-center text-gray-500">註冊頁面背景內容...</div>} />

          <Route path="projectall" element={<ProjectAll />} /> 


        </Route>
      </Routes>
    </Router>
  );
}

export default App;