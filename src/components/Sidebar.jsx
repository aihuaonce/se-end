import { Link, useLocation } from 'react-router-dom'; 
import { DollarSign, Receipt, Users, Footprints, Calculator, Wallet, LineChart, Calendar, Phone, MessageSquare, Clock, Send, Lightbulb, FileText } from "lucide-react"; // 導入更多合適的圖標

export default function Sidebar() {
  const location = useLocation(); 

  const getLinkClassName = (path) => {
    const isOverviewActive = (path === '/finance/overview' && (location.pathname === '/finance' || location.pathname === '/finance/overview'));
    const isSubPathActive = (path !== '/finance/overview' && location.pathname.startsWith(path));
    const isExactPathActive = (path === '/' || !path.startsWith('/finance')) && location.pathname === path;

    const isActive = isOverviewActive || isSubPathActive || isExactPathActive;

    return `
      flex items-center gap-2 w-full py-2 px-4 rounded transition duration-200 ease-in-out
      ${isActive
        ? 'bg-white text-[#C9C2B2] font-semibold shadow-md' 
        : 'hover:bg-gray-100 hover:text-[#B7B09F] text-[#CB8A90]' 
      }
    `;
  };

  return (
    <div className="h-screen w-48 bg-white flex flex-col flex-shrink-0" style={{ color: '#CB8A90' }}> 

      <nav className="flex-1 overflow-y-auto w-full">
        <ul className="space-y-1 p-2 text-sm w-full">
          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            專案
          </li>
          <li> 
            <Link to="/" className={getLinkClassName('/')}>
              <Calendar size={18} />
              <span>排程</span>
            </Link>
          </li>

          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            顧客
          </li>
          <li> 
            <Link to="/customer" className={getLinkClassName('/customer')}>
              <Phone size={18} />
              <span>聯絡</span>
            </Link>
          </li>
          <li>
            <Link to="/customers/communication" className={getLinkClassName('/customers/communication')}>
              <MessageSquare size={18} />
              <span>溝通</span>
            </Link>
          </li>
          <li> 
            <Link to="/booking" className={getLinkClassName('/booking')}>
              <Clock size={18} />
              <span>預約</span>
            </Link>
          </li>

          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            服務
          </li>
          <li>
            <Link to="/service" className={getLinkClassName('/service')}>
              <Send size={18} />
              <span>自動化賀卡寄送</span>
            </Link>
          </li>
          <li> 
            <Link to="/process" className={getLinkClassName('/process')}>
              <Lightbulb size={18} />
              <span>AI流程設計</span>
            </Link>
          </li>
          <li> 
            <Link to="/services/contracts-quotes" className={getLinkClassName('/services/contracts-quotes')}>
              <FileText size={18} />
              <span>合約報價</span>
            </Link>
          </li>

          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            財務
          </li>
          <li>
            <Link to="/finance/overview" className={getLinkClassName('/finance/overview')}>
              <DollarSign size={18} />
              <span>概覽</span>
            </Link>
          </li>
          <li>
            <Link to="/finance/invoices" className={getLinkClassName('/finance/invoices')}>
              <Receipt size={18} />
              <span>發票管理</span>
            </Link>
          </li>
          <li>
            <Link to="/finance/customers" className={getLinkClassName('/finance/customers')}>
              <Users size={18} />
              <span>客戶管理</span>
            </Link>
          </li>
          <li>
            <Link to="/finance/payments" className={getLinkClassName('/finance/payments')}>
              <Footprints size={18} />
              <span>付款記錄</span>
            </Link>
          </li>
          <li>
            <Link to="/finance/expenses" className={getLinkClassName('/finance/expenses')}>
              <Calculator size={18} />
              <span>支出管理</span>
            </Link>
          </li>
          <li>
            <Link to="/finance/pettyCash" className={getLinkClassName('/finance/pettyCash')}>
              <Wallet size={18} />
              <span>零用金收支管理</span>
            </Link>
          </li>
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