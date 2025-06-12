import { Link } from 'react-router-dom';
import { LayoutDashboard, Users, Bus, DollarSign, Calendar, Phone, MessageSquare, Clock, Send, Lightbulb, FileText } from "lucide-react"; // 導入更多合適的圖標

export default function Sidebar() {
  return (
    <div className="h-screen w-64 bg-white flex flex-col" style={{ color: '#CB8A90' }}> 

      <nav className="flex-1 overflow-y-auto w-full">
        <ul className="space-y-1 p-2 text-sm w-full">
          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            專案
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/projects/schedule" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Calendar size={18} />
              <span>排程</span>
            </Link>
          </li>

          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            顧客
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer"> 
            <Link to="/customers/contact" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Phone size={18} />
              <span>聯絡</span>
            </Link>
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/customers/communication" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <MessageSquare size={18} />
              <span>溝通</span>
            </Link>
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer"> 
            <Link to="/customers/appointment" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Clock size={18} />
              <span>預約</span>
            </Link>
          </li>

          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            服務
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/service" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Send size={18} />
              <span>自動化賀卡寄送</span>
            </Link>
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer"> 
            <Link to="/services/ai-workflow" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Lightbulb size={18} />
              <span>AI流程設計</span>
            </Link>
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer"> 
            <Link to="/services/contracts-quotes" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <FileText size={18} />
              <span>合約報價</span>
            </Link>
          </li>

          <li className="font-bold text-lg mt-4 mb-2 pl-2" style={{ color: '#CB8A90' }}> 
            財務
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/finance/overview" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <DollarSign size={18} />
              <span>財務總覽</span>
            </Link>
          </li>
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/finance/payments" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <LayoutDashboard size={18} />
              <span>付款紀錄</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}