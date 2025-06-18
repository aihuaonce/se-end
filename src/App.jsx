import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePages';
import ServicePage from './pages/ServicePage';
import CustomerPage from './pages/CustomerPage';
import FinancePage from './pages/FinancePage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import CustomerDetails from './pages/CustomerDetail';
import RegisterPage from './pages/RegisterPage';
import PersonDataPage from "./pages/PersonDataPage";
import ReservationsPage from "./pages/ReservationsPage";
import AdminChatPage from "./pages/AdminChatPage";
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <Router>
      <div className="flex flex-col h-screen">
        {<Header />}
        <div className="flex flex-grow">
          <Sidebar />
          <main className="flex-grow p-4 overflow-y-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/service" element={<ServicePage />} />
              <Route path="/customer" element={<CustomerPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/customer/:id" element={<CustomerDetails />} />
              <Route path="*" element={<NotFoundPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/persondata" element={<PersonDataPage />} />
              <Route path="/reservations" element={<ReservationsPage />} />
              <Route path="/admin/chat" element={<AdminChatPage />} />
            </Routes>
          </main>
        </div>
        {<Footer />}
      </div>
    </Router>
  );
}

export default App;
