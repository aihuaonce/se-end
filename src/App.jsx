import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

import HomePage from './pages/HomePages';
import ServicePageContent from './ServicePages/ServicePage';
import DesignProcess from './ServicePages/DesignProcess';
import CustomerPage from './pages/CustomerPage';
import FinancePage from './FinancePage/FinancePage';
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

  useEffect(() => {
    if (location.pathname === '/finance' || location.pathname === '/finance/') {
      navigate('/finance/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
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
      <div className="flex flex-grow min-h-0">
        <Sidebar />
        <main className="flex-grow bg-slate-100 overflow-x-hidden overflow-y-auto flex flex-col min-w-0">
          <div className="p-4 flex-grow min-h-0">
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