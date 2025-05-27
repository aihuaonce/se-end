import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePages';
import ServicePage from './pages/ServicePage';
import CustomerPage from './pages/CustomerPage';
import FinancePage from './pages/FinancePage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import CustomerDetails from './pages/CustomerDetail';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <Header/>
      <main style={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/customer/:id" element={<CustomerDetails />} />
        </Routes>
      </main>
      <Footer/>
    </Router>
  );
}

export default App;