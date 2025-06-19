import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token'); // 檢查是否存在後台 token

  if (!isAuthenticated) {
    // 如果未認證，導向到登入路徑，App.jsx 會在該路徑下觸發模態框顯示
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;