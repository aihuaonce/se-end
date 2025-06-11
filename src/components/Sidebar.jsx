import { Home, LayoutDashboard, Bus, Map, Users } from "lucide-react";
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="h-screen w-64 bg-white flex flex-col" style={{ color: '#CB8A90' }}>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 p-2 text-sm">
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <LayoutDashboard size={18} style={{ color: '#CB8A90' }}/>
              <span>首頁</span>
            </Link>
          </li>

          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/service" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Bus size={18} style={{ color: '#CB8A90' }}/>
              <span>服務</span>
            </Link>
          </li>

          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/map" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Map size={18} style={{ color: '#CB8A90' }}/>
              <span>地圖</span>
            </Link>
          </li>

          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/users" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}>
              <Users size={18} style={{ color: '#CB8A90' }}/>
              <span>用戶</span>
            </Link>
          </li>
          
          <li className="p-2 rounded hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Link to="/login" className="flex items-center gap-2 w-full" style={{ color: '#CB8A90' }}> 
              <Home size={18} style={{ color: '#CB8A90' }}/>
              <span>登入</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}