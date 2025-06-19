// frontend/src/components/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom'; 
import { DollarSign, Receipt, Users, Footprints, Calculator, Wallet, LineChart, Calendar, Phone, MessageSquare, Clock, Send, Lightbulb, FileText, Briefcase, Tag} from "lucide-react"; // 導入更多合適的圖標

// 接收 isLoggedIn prop
export default function Sidebar({ isLoggedIn }) {
  const location = useLocation(); 

  const getLinkClassName = (path) => {
    return `
    flex items-center gap-1 w-full py-1.5 px-2 rounded transition duration-200 ease-in-out
    hover:bg-gray-100 hover:text-[#B7B09F] text-[#CB8A90] 
    text-sm
    `;
  };

  return (
    <div className="h-full w-40 bg-white flex flex-col flex-shrink-0" style={{ color: '#CB8A90' }}> 

    <nav className="flex-1 overflow-y-auto w-full">
      <ul className="space-y-0.5 p-1 text-xs w-full"> 
          {/* 只有在登入時才顯示專案相關連結 */}
          {isLoggedIn && (
            <>
              <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}> 
                專案
              </li>
              <li> 
                <Link to="/" className={getLinkClassName('/')}>
                  <Calendar size={18} />
                  <span>排程</span>
                </Link>
              </li>
              
              <li> 
                <Link to="/projectall" className={getLinkClassName('/projectall')}>
                  <Calendar size={18} />
                  <span>專案列表</span>
                </Link>
              </li>
            </>
          )}

          {/* 只有在登入時才顯示顧客相關連結 */}
          {isLoggedIn && (
            <>
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
                <Link to="/level" className={getLinkClassName('/level')}>
                  <Tag size={18} />
                  <span>分級</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/chat" className={getLinkClassName('/admin/chat')}>
                  <MessageSquare size={18} />
                  <span>溝通</span>
                </Link>
              </li>
              <li>
                <Link to="/reservations" className={getLinkClassName('/reservations')}>
                  <Clock size={18} />
                  <span>預約</span>
                </Link>
              </li>
            </>
          )}

          {/* 服務連結，如果某些服務是公開的，可以放在這裡，否則也需要 isLoggedIn 條件 */}
          <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}>  
            服務
          </li>
          {/* 假設這些服務對未登入用戶也開放，如果不是，請加上 isLoggedIn 條件 */}
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
            <Link to="/vendor" className={getLinkClassName('/vendor')}>
              <Briefcase size={18} />
              <span>廠商推薦</span>
            </Link>
          </li>

          {/* 只有在登入時才顯示財務相關連結 */}
          {isLoggedIn && (
            <>
              <li className="font-bold text-base mt-2 mb-1 pl-1" style={{ color: '#CB8A90' }}>  
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
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}