// src/components/Sidebar.jsx

import { Link, useLocation } from 'react-router-dom';
import { DollarSign, Receipt, Users, Footprints, Calculator, Wallet, LineChart, Calendar, Phone, MessageSquare, Clock, Send, Lightbulb, FileText } from "lucide-react"; // 導入更多合適的圖標

export default function Sidebar() {
  const location = useLocation(); 

  // 根據當前路徑判斷連結的樣式
  const getLinkClassName = (path) => {
    // 判斷是否是當前活躍的連結
    const isActive = location.pathname === path;

    return `
      flex items-center gap-1 w-full py-1.5 px-2 rounded transition duration-200 ease-in-out
      hover:bg-gray-100 hover:text-[#B7B09F] text-[#CB8A90] 
      text-sm
      ${isActive ? 'bg-gray-100 text-[#B7B09F] font-bold' : ''} // 活躍狀態的樣式
    `;
  };

  return (
    // 側欄容器，設定固定寬度、背景和文本顏色
    <div className="h-full w-40 bg-white flex flex-col flex-shrink-0" style={{ color: '#CB8A90' }}> 

      {/* 導覽區域，允許滾動 */}
      <nav className="flex-1 overflow-y-auto w-full">
        <ul className="space-y-0.5 p-1 text-xs w-full"> 
          {/* 專案區塊標題 */}
          <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}> 
            專案
          </li>
          {/* 排程連結 */}
          <li> 
            <Link to="/" className={getLinkClassName('/')}>
              <Calendar size={18} />
              <span>排程</span>
            </Link>
          </li>

          {/* 顧客區塊標題 */}
          <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}> 
            顧客
          </li>
          {/* 聯絡連結 */}
          <li> 
            <Link to="/customer" className={getLinkClassName('/customer')}>
              <Phone size={18} />
              <span>聯絡</span>
            </Link>
          </li>
          {/* 溝通連結 */}
          <li>
            <Link to="/customers/communication" className={getLinkClassName('/customers/communication')}>
              <MessageSquare size={18} />
              <span>溝通</span>
            </Link>
          </li>
          {/* 預約連結 */}
          <li> 
            <Link to="/booking" className={getLinkClassName('/booking')}>
              <Clock size={18} />
              <span>預約</span>
            </Link>
          </li>

          {/* 服務區塊標題 */}
          <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}> 
            服務
          </li>
          {/* 自動化賀卡寄送連結 */}
          <li>
            <Link to="/service" className={getLinkClassName('/service')}>
              <Send size={18} />
              <span>自動化賀卡寄送</span>
            </Link>
          </li>
          {/* AI 流程設計連結 */}
          <li> 
            <Link to="/process" className={getLinkClassName('/process')}>
              <Lightbulb size={18} />
              <span>AI流程設計</span>
            </Link>
          </li>
          {/* 合約報價連結 */}
          <li> 
            <Link to="/services/contracts-quotes" className={getLinkClassName('/services/contracts-quotes')}>
              <FileText size={18} />
              <span>合約報價</span>
            </Link>
          </li>
          {/* AI 分身牆連結 (已移動到服務區塊) */}
          <li> 
            <Link to="/guestwall" className={getLinkClassName('/guestwall')}>
              <Users size={18} /> {/* 使用 Users 圖示，與你的 AI 分身牆功能相關 */}
              <span>AI 分身牆</span>
            </Link>
          </li>

          {/* 財務區塊標題 */}
          <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}> 
            財務
          </li>
          {/* 概覽連結 */}
          <li>
            <Link to="/finance/overview" className={getLinkClassName('/finance/overview')}>
              <DollarSign size={18} />
              <span>概覽</span>
            </Link>
          </li>
          {/* 發票管理連結 */}
          <li>
            <Link to="/finance/invoices" className={getLinkClassName('/finance/invoices')}>
              <Receipt size={18} />
              <span>發票管理</span>
            </Link>
          </li>
          {/* 客戶管理連結 */}
          <li>
            <Link to="/finance/customers" className={getLinkClassName('/finance/customers')}>
              <Users size={18} />
              <span>客戶管理</span>
            </Link>
          </li>
          {/* 付款記錄連結 */}
          <li>
            <Link to="/finance/payments" className={getLinkClassName('/finance/payments')}>
              <Footprints size={18} />
              <span>付款記錄</span>
            </Link>
          </li>
          {/* 支出管理連結 */}
          <li>
            <Link to="/finance/expenses" className={getLinkClassName('/finance/expenses')}>
              <Calculator size={18} />
              <span>支出管理</span>
            </Link>
          </li>
          {/* 零用金收支管理連結 */}
          <li>
            <Link to="/finance/pettyCash" className={getLinkClassName('/finance/pettyCash')}>
              <Wallet size={18} />
              <span>零用金收支管理</span>
            </Link>
          </li>
          {/* 月報表連結 */}
          <li>
            <Link to="/finance/monthlyReport" className={getLinkClassName('/finance/monthlyReport')}>
              <LineChart size={18} />
              <span>月報表</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
