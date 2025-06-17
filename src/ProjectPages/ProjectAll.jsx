import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProjectAll = () => {
  const [projectall, setProjectall] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:5713/api/projectall'); // 注意: 對應 server 的路由改為 /api/projects
        const data = await res.json();
        setProjectall(data);
      } catch (error) {
        console.error('專案詳情取得失敗:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#cb8a90]">專案列表</h2>
        <button
          className="bg-[#cb8a90] text-white px-4 py-2 rounded hover:bg-[#b3777d]"
          onClick={() => navigate('/projectall/new')}
        >
          ＋ 新增專案
        </button>
      </div>

      <div className="overflow-auto bg-white border rounded-lg shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#cb8a90] text-white">
            <tr>
              <th className="px-4 py-2">專案ID</th>
              <th className="px-4 py-2">聯絡人</th>
              <th className="px-4 py-2">婚期</th>
              <th className="px-4 py-2">方案ID</th>
              <th className="px-4 py-2">狀態</th>
              <th className="px-4 py-2">建立</th>
              <th className="px-4 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {projectall.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">尚無資料</td>
              </tr>
            ) : (
              projectall.map((p) => (
                <tr key={p.project_id} className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2">{p.project_id}</td>
                  <td className="px-4 py-2">{p.client_name}</td>
                  <td className="px-4 py-2">{p.wedding_date}</td>
                  <td className="px-4 py-2">{p.plan_id}</td>
                  <td className="px-4 py-2">{p.project_status}</td>
                  <td className="px-4 py-2">{p.project_build_time}</td>
                  <td className="px-4 py-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => navigate(`/projectall/${p.project_id}`)}
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectAll;
