import React, { useEffect, useState } from 'react';
import '../styles/ProjectStages.css';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment'; // 引入 moment 處理日期格式顯示

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保與後端伺服器端口一致

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null); // 用於儲存從後端獲取的專案詳情資料
  const [taskStages, setTaskStages] = useState([]); // 硬編碼的任務階段
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(''); // 用於顧客需求細節 textarea

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null); // 儲存 fetch 錯誤訊息

  // 頁面載入時獲取專案詳情並初始化任務階段
  useEffect(() => {
    fetchProjectDetails();
    initializeStages(); // 硬編碼的階段初始化
  }, [id]); // 確保當 id 改變時重新觸發

  const fetchProjectDetails = async () => {
    setLoading(true);
    setNotFound(false);
    setError(null); // 重置錯誤狀態
    try {
      // 使用完整的後端 API 路徑
      const res = await fetch(`${API_URL}/api/projects/${id}`);

      if (!res.ok) {
        // 如果狀態碼不是 2xx，嘗試讀取後端錯誤訊息
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        if (res.status === 404) {
             setNotFound(true);
             console.warn(`專案ID ${id} 不存在`);
             return; // 找到 404 就直接結束
        }
        throw new Error(errorBody.message || `HTTP 錯誤：${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // 根據後端返回的數據結構判斷是否找到專案
      if (!data || Object.keys(data).length === 0) {
        setNotFound(true);
      } else {
        setProject(data);
        // 如果你的 project_details 表格有對應 note 的欄位（例如叫 needs_description 或 remark），可以在這裡初始化 note state
        // 否則，這個 note 欄位目前無法透過這個 PUT 請求儲存
        // 暫時假定它可能對應 remark 或其他文字欄位，如果沒有，需移除或另行處理
        setNote(data.remark || ''); // 根據你的實際欄位名調整
      }
    } catch (err) {
      console.error('❌ 專案資料載入失敗:', err);
      setError(`無法載入專案資料：${err.message}`); // 設定錯誤訊息
      setNotFound(true); // 任何 fetch 錯誤或解析錯誤都視為找不到或無法載入
    } finally {
      setLoading(false);
    }
  };

  // 初始化硬編碼的任務階段
  const initializeStages = () => {
    const stages = [
      { title: '婚禮前 9-18 個月', tasks: ['選定婚期','確定婚宴場地','找婚顧','初估人數','確定婚禮形式'] },
      { title: '婚禮前 3-9 個月', tasks: ['找新娘秘書','找婚禮攝影','找婚顧拍婚紗','討論佈置風格'] },
      { title: '婚禮前 3 個月', tasks: ['訂喜餅','挑婚戒','挑婚紗禮服','主持人','婚禮MV','設計喜帖','婚禮小物','規劃婚禮流程','協助人員名單','決定人員','統計賓客','規劃蜜月'] },
      { title: '婚禮前 2 個月', tasks: ['西服','親友服裝','寄喜帖','溝通婚禮儀式','採買婚禮用品','租禮車'] },
      { title: '婚禮前 1 個月', tasks: ['新娘試妝','婚禮佈置','試菜','主持溝通','賓客名單&座位表','贈禮道具','當日路線'] },
      { title: '婚禮前 1-2 週', tasks: ['結婚誓詞','彩排驗收','確認桌數','確認廠商','確認用品','紅包表','禮車表','人員通知','婚前保養','家長會議'] },
    ];

    const stageState = stages.map((stage, sIdx) => ({ // 給 stage 加上 key
      title: stage.title,
      tasks: stage.tasks.map((name, tIdx) => ({ name, done: false, key: `${sIdx}-${tIdx}` })) // 給 task 加上 key
    }));
    setTaskStages(stageState);
  };

  // 切換任務完成狀態 (僅在編輯模式下有效)
  const toggleTask = (stageIdx, taskIdx) => {
    if (!isEditing) return; // 不在編輯模式不允許切換
    const updatedStages = [...taskStages];
    updatedStages[stageIdx].tasks[taskIdx].done = !updatedStages[stageIdx].tasks[taskIdx].done;
    setTaskStages(updatedStages);
    // 注意：如果 taskStages 的完成狀態需要保存到後端，這裡還需要一個保存的邏輯
  };

  // 保存專案資料到後端
  const handleSave = async () => {
    // 如果不在編輯模式，不執行保存
    if (!isEditing) {
        alert('請先點擊編輯按鈕');
        return;
    };

    // 準備要更新的資料物件
    // 這裡只傳遞 project_details 表格中可以更新的欄位
    // 注意：根據你的 schema，project_details 的 primary key 是 project_id 且沒有 auto_increment
    // 這是一個奇怪的設計。通常 project_id 是 FK 指向 projects.project_id
    // 我們假定你要更新的是 project_details 表格中的資訊
    const updatedProjectData = {
        // 從 state 中複製需要保存的欄位
        groom_name: project.groom_name,
        bride_name: project.bride_name,
        client_name: project.client_name,
        phone_num: project.phone_num, // 確保格式符合 INT
        wedding_date: project.wedding_date, // 確保格式符合 DATE
        wedding_place: project.wedding_place,
        // budget_id: project.budget_id, // 假設 budget_id 是 INT
        // plan_id: project.plan_id,     // 假設 plan_id 是 INT
        // wedding_style: project.wedding_style, // 假設 wedding_style 是 INT
        // 顧客需求細節 (note): 根據你的 Schema，project_details 表格沒有這個欄位
        // 如果需要保存 note，請確認資料庫 Schema 或將其保存到其他相關表格
        // 例如：假設 project_details 有一個 remark 文字欄位
        remark: note, // 如果 project_details 有 remark 欄位，否則移除此行
        // project_build_time 和 project_update_time 通常由後端管理，不從前端發送
    };

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, { // 使用完整的後端 PUT 路由路徑
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProjectData) // 發送更新後的資料
      });

      if (!response.ok) {
        // 嘗試讀取後端返回的錯誤訊息
        const errorBody = await response.json().catch(() => ({ message: '未知更新失敗' }));
        throw new Error(errorBody.message || `更新失敗: ${response.status} ${response.statusText}`);
      }

      // 如果後端 PUT 成功後返回更新後的資料，可以更新前端 state
      // const result = await response.json(); // 如果後端返回了新的 project 資料
      alert('✅ 專案資料已更新');
      // 可選：如果後端返回了更新後的完整資料，更新 project state
      // setProject(result.updatedData); // 根據後端返回的結構調整

    } catch (error) {
      console.error('❌ 更新失敗:', error);
      alert(`❌ 更新失敗: ${error.message}`); // 顯示更詳細的錯誤訊息
    } finally {
      setIsEditing(false); // 無論成功失敗，通常都會退出編輯模式
      // 保存成功後重新獲取最新數據，確保顯示的是數據庫的最新狀態
      fetchProjectDetails();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        {/* 回到上一頁按鈕，導航到 /projects */}
        <button
          onClick={() => navigate('/projects')}
          className="text-[#cb8a90] hover:underline"
        >
          ← 回到專案列表
        </button>
        <div>
          {/* 編輯按鈕 */}
          {!isEditing && (
             <button
               onClick={() => setIsEditing(true)}
               className="bg-yellow-400 text-white font-semibold px-4 py-2 rounded mr-2 hover:bg-yellow-500"
             >
               編輯
             </button>
          )}
          {/* 保存按鈕 (僅在編輯模式顯示) */}
          {isEditing && (
              <button
                onClick={handleSave}
                className="bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700"
              >
                保存
              </button>
          )}
           {/* 取消編輯按鈕 (僅在編輯模式顯示) */}
           {isEditing && (
               <button
                 onClick={() => { setIsEditing(false); fetchProjectDetails(); }} // 取消時重新載入資料，放棄修改
                 className="bg-gray-400 text-white font-semibold px-4 py-2 rounded ml-2 hover:bg-gray-500"
               >
                 取消
               </button>
           )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">📦 專案載入中...</p>
      ) : error ? ( // 如果有 fetch 錯誤，顯示錯誤訊息
        <p className="text-red-500">❌ {error}</p>
      ) : notFound ? ( // 如果找不到專案，顯示找不到的訊息
        <p className="text-red-500">❌ 專案不存在或尚無資料</p>
      ) : (
        <>
          {/* 專案基本資料表格 */}
          <table className="table-auto border w-full mb-6">
            <tbody>
              <tr>
                <th className="border px-4 py-2">專案ID</th>
                <td className="border px-4 py-2">{project.project_id}</td>
                <th className="border px-4 py-2">新郎</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.groom_name || ''} onChange={e => setProject({ ...project, groom_name: e.target.value })} className="w-full border px-1" /> : project.groom_name}
                </td>
                <th className="border px-4 py-2">新娘</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.bride_name || ''} onChange={e => setProject({ ...project, bride_name: e.target.value })} className="w-full border px-1" /> : project.bride_name}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">聯絡人</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.client_name || ''} onChange={e => setProject({ ...project, client_name: e.target.value })} className="w-full border px-1" /> : project.client_name}
                </td>
                <th className="border px-4 py-2">電話</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.phone_num || ''} onChange={e => setProject({ ...project, phone_num: e.target.value })} className="w-full border px-1" /> : project.phone_num} {/* 注意：電話在Schema中是INT */}
                </td>
                <th className="border px-4 py-2">婚期</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input type="date" value={project.wedding_date || ''} onChange={e => setProject({ ...project, wedding_date: e.target.value })} className="w-full border px-1" /> : (project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : '未設定')} {/* 顯示時格式化日期 */}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">地點</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.wedding_place || ''} onChange={e => setProject({ ...project, wedding_place: e.target.value })} className="w-full border px-1" /> : project.wedding_place}
                </td>
                <th className="border px-4 py-2">預算ID</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input type="number" value={project.budget_id || ''} onChange={e => setProject({ ...project, budget_id: e.target.value })} className="w-full border px-1" /> : project.budget_id} {/* 預算ID 假設是INT */}
                </td>
                <th className="border px-4 py-2">方案ID</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input type="number" value={project.plan_id || ''} onChange={e => setProject({ ...project, plan_id: e.target.value })} className="w-full border px-1" /> : project.plan_id} {/* 方案ID 假設是INT */}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">風格</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.wedding_style || ''} onChange={e => setProject({ ...project, wedding_style: e.target.value })} className="w-full border px-1" /> : project.wedding_style} {/* 風格 假設是文字或INT */}
                </td>
                <th className="border px-4 py-2">建立時間</th>
                <td className="border px-4 py-2">{project.project_build_time}</td>
                <th className="border px-4 py-2">更新時間</th>
                <td className="border px-4 py-2">{project.project_update_time}</td>
              </tr>
            </tbody>
          </table>

          {/* 顧客需求細節 textarea */}
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">顧客需求細節：</label>
            <textarea
              rows="4"
              className="w-full border rounded p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!isEditing}
            />
             {/* 備註：此處的 note state 目前假定對應 project_details 表格的 remark 欄位進行儲存 */}
          </div>

          {/* 硬編碼的任務階段列表，並加上 key prop */}
          {taskStages.map((stage, sIdx) => (
            <div className="stage" key={sIdx}> {/* 在這裡加上 key prop */}
              <h2>{stage.title}</h2>
              <ul>
                {stage.tasks.map((task) => ( // task 對象已經有 key 屬性
                  <li
                    key={task.key} // 使用 task 對象中的 key 屬性
                    className={task.done ? 'done' : 'not-done'}
                    onClick={() => toggleTask(sIdx, taskStages[sIdx].tasks.findIndex(t => t.key === task.key))} // 使用找到的索引
                  >
                    {task.name} {task.done && <span className="ml-2">✔</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default ProjectDetailPage;