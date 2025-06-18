import React, { useEffect, useState } from 'react';
import '../styles/ProjectStages.css';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment'; // 引入 moment 處理日期格式顯示

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保與後端伺服器端口一致

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // project state 現在會包含來自 project_details_view 的合併資料
  const [project, setProject] = useState(null);
  const [taskStages, setTaskStages] = useState([]); // 硬編碼的任務階段
  const [isEditing, setIsEditing] = useState(false);
  // note state 現在明確對應 project_couple_details 的 remark 欄位
  const [note, setNote] = useState('');

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
      // 使用完整的後端 API 路徑 /api/projects/:id
      // 這個路由在後端應該返回 project_details_view 的數據結構
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
        // 從後端返回的數據中讀取 remark 欄位的值來初始化 note state
        setNote(data.couple_needs_remark || ''); // 根據 project_details_view 的欄位名調整
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

    // 為每個 task 添加一個唯一的 key
    const stageState = stages.map((stage, sIdx) => ({
      title: stage.title,
      tasks: stage.tasks.map((name, tIdx) => ({ name, done: false, key: `${sIdx}-${tIdx}` }))
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
    // 這個可能需要一個新的 project_tasks 表格，並與 project_id 關聯
  };

  // 保存專案資料到後端
  const handleSave = async () => {
    // 如果不在編輯模式，不執行保存
    if (!isEditing) {
        alert('請先點擊編輯按鈕');
        return;
    };

    // 準備要更新的資料物件
    // 根據優化後的後端 PUT /api/projects/:id 路由，它主要更新 project_couple_details 的欄位
    // 所以我們只發送這些相關的欄位
    const updatedProjectData = {
        // 從 project state 中讀取要更新到 project_couple_details 的欄位
        groom_name: project.groom_name,
        bride_name: project.bride_name,
        // 使用 project.couple_phone 而不是 project.phone_num (根據 project_details_view)
        phone: project.couple_phone, // 注意 Schema 中 phone 欄位現在是 VARCHAR
        // project.wedding_date 從 project state 中讀取
        wedding_date: project.wedding_date, // 注意 ProjectDetailPage 中的 project.wedding_date 是從後端直接讀取，格式應符合後端 DATE 類型
        wedding_place: project.wedding_place,
        budget_id: project.budget_id, // 假設 budget_id 需要從前端更新
        plan_id: project.plan_id,     // 假設 plan_id 需要從前端更新
        wedding_style: project.wedding_style, // 假設 wedding_style 需要從前端更新 (VARCHAR)
        // 顧客需求細節 note 對應到後端的 remark 欄位
        remark: note, // 這個欄位在 project_couple_details 中，且後端 PUT 允許更新

        // 注意：project_details_view 中還有其他欄位（例如 horoscope, blood_type 等），
        // 如果前端編輯偏好，則需要在 DesignProcessDetail 頁面處理其保存邏輯。
        // project_id, project_name, customer_name, plan_name, project_status, total_budget, google_sheet_link, created_at, updated_at 等
        // 這些欄位通常不應該從這個頁面直接更新，或者需要後端 PUT 路由做更複雜的處理 (更新 multiple tables)。
        // 目前的 PUT 路由只更新 project_couple_details
    };

    try {
      // 使用完整的後端 PUT 路由路徑 /api/projects/:id
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProjectData) // 發送更新後的資料
      });

      if (!response.ok) {
        // 嘗試讀取後端返回的錯誤訊息
        const errorBody = await response.json().catch(() => ({ message: '未知更新失敗' }));
        throw new Error(errorBody.message || `更新失敗: ${response.status} ${response.statusText}`);
      }

      // 如果後端 PUT 成功後可以選擇重新獲取數據來更新顯示
      // const result = await response.json(); // 如果後端返回了新的 project 資料
      alert('✅ 專案資料已更新');
      // 可選：如果後端返回了更新後的完整資料，更新 project state
      // setProject(result.updatedData); // 根據後端返回的結構調整

    } catch (error) {
      console.error('❌ 更新失敗:', error);
      setError(`❌ 更新失敗: ${error.message}`); // 顯示更詳細的錯誤訊息
      alert(`❌ 更新失敗: ${error.message}`); // 也彈窗提示錯誤
    } finally {
      setIsEditing(false); // 無論成功失敗，通常都會退出編輯模式
      // 保存成功後或取消編輯時重新獲取最新數據，確保顯示的是數據庫的最新狀態
      fetchProjectDetails();
    }
  };

  // 處理基本資料輸入框的變更
  const handleProjectChange = (field, value) => {
    setProject(prev => ({
        ...prev,
        [field]: value
    }));
  };


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        {/* 回到專案列表按鈕，導航到 /projects */}
        <button
          onClick={() => navigate('/projects')}
          className="text-[#cb8a90] hover:underline"
        >
          ← 回到專案列表
        </button>
        <div>
          {/* 編輯按鈕 (僅在非編輯模式顯示) */}
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

      {/* 根據 loading, error, notFound 狀態顯示不同內容 */}
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
                 <th className="border px-4 py-2">專案名稱</th> {/* 新增專案名稱欄位顯示 */}
                <td className="border px-4 py-2">{project.project_name}</td>
                <th className="border px-4 py-2">主要客戶 (付款方)</th> {/* 新增主要客戶欄位顯示 */}
                <td className="border px-4 py-2">{project.customer_name}</td>
              </tr>
              <tr>
                <th className="border px-4 py-2">新郎</th>
                <td className="border px-4 py-2">
                  {/* 編輯模式下使用 input，數據綁定 project.groom_name */}
                  {isEditing ? <input value={project.groom_name || ''} onChange={e => handleProjectChange('groom_name', e.target.value)} className="w-full border px-1" /> : project.groom_name}
                </td>
                <th className="border px-4 py-2">新娘</th>
                <td className="border px-4 py-2">
                  {/* 編輯模式下使用 input，數據綁定 project.bride_name */}
                  {isEditing ? <input value={project.bride_name || ''} onChange={e => handleProjectChange('bride_name', e.target.value)} className="w-full border px-1" /> : project.bride_name}
                </td>
                <th className="border px-4 py-2">情侶電話</th> {/* 欄位名改為 情侶電話 */}
                <td className="border px-4 py-2">
                   {/* 編輯模式下使用 input，數據綁定 project.couple_phone */}
                  {isEditing ? <input value={project.couple_phone || ''} onChange={e => handleProjectChange('couple_phone', e.target.value)} className="w-full border px-1" /> : project.couple_phone} {/* 使用 couple_phone */}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">情侶信箱</th> {/* 新增 情侶信箱 欄位顯示 */}
                 <td className="border px-4 py-2">{project.couple_email}</td> {/* 使用 couple_email */}
                <th className="border px-4 py-2">婚期</th>
                <td className="border px-4 py-2">
                  {/* 編輯模式下使用 type="date" input，數據綁定 project.wedding_date */}
                  {isEditing ? <input type="date" value={project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : ''} onChange={e => handleProjectChange('wedding_date', e.target.value)} className="w-full border px-1" /> : (project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : '未設定')} {/* 顯示時格式化日期 */}
                </td>
                 <th className="border px-4 py-2">婚禮時間</th> {/* 新增 婚禮時間 欄位顯示 */}
                 <td className="border px-4 py-2">
                    {/* 編輯模式下使用 type="time" input，數據綁定 project.wedding_time */}
                   {isEditing ? <input type="time" value={project.wedding_time || ''} onChange={e => handleProjectChange('wedding_time', e.target.value)} className="w-full border px-1" /> : (project.wedding_time || '未設定')} {/* 使用 wedding_time */}
                 </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">地點</th>
                <td className="border px-4 py-2">
                   {/* 編輯模式下使用 input，數據綁定 project.wedding_place */}
                  {isEditing ? <input value={project.wedding_place || ''} onChange={e => handleProjectChange('wedding_place', e.target.value)} className="w-full border px-1" /> : project.wedding_place} {/* 使用 wedding_place */}
                </td>
                <th className="border px-4 py-2">預算ID</th>
                <td className="border px-4 py-2">
                  {/* 編輯模式下使用 input，數據綁定 project.budget_id */}
                  {isEditing ? <input type="number" value={project.budget_id || ''} onChange={e => handleProjectChange('budget_id', e.target.value)} className="w-full border px-1" /> : project.budget_id} {/* 預算ID */}
                </td>
                <th className="border px-4 py-2">方案ID</th>
                <td className="border px-4 py-2">
                   {/* 編輯模式下使用 input，數據綁定 project.plan_id */}
                  {isEditing ? <input type="number" value={project.plan_id || ''} onChange={e => handleProjectChange('plan_id', e.target.value)} className="w-full border px-1" /> : project.plan_id} {/* 方案ID */}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">風格</th> {/* 欄位名改為 風格 */}
                <td className="border px-4 py-2">
                   {/* 編輯模式下使用 input，數據綁定 project.wedding_style */}
                   {/* 注意：Schema 中 wedding_style 現在是 VARCHAR，輸入框類型可保持 text 或根據需求調整 */}
                  {isEditing ? <input value={project.wedding_style || ''} onChange={e => handleProjectChange('wedding_style', e.target.value)} className="w-full border px-1" /> : project.wedding_style} {/* 使用 wedding_style */}
                </td>
                <th className="border px-4 py-2">建立時間</th>
                <td className="border px-4 py-2">{project.project_build_time}</td>
                <th className="border px-4 py-2">更新時間</th>
                <td className="border px-4 py-2">{project.project_update_time}</td>
              </tr>
               {/* 新增 Google 表單連結顯示 */}
              <tr>
                <th className="border px-4 py-2">Google 表單</th>
                 <td className="border px-4 py-2" colSpan="5">
                    {project.google_sheet_link ? (
                       <a href={project.google_sheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                         {project.google_sheet_link}
                       </a>
                    ) : '未提供'}
                 </td>
              </tr>
            </tbody>
          </table>

          {/* 顧客需求細節 textarea，數據綁定 note state */}
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">顧客需求細節：</label>
            <textarea
              rows="4"
              className="w-full border rounded p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!isEditing} // 僅在編輯模式下可編輯
            />
             {/* 備註：此處的 note state 對應 project_couple_details 表格的 remark 欄位進行儲存 */}
          </div>

          {/* 硬編碼的任務階段列表，並加上 key prop */}
          {/* 注意：這個列表的完成狀態(done)目前沒有與後端關聯和保存的邏輯 */}
          {taskStages.map((stage, sIdx) => (
            <div className="stage" key={sIdx}> {/* 在這裡加上 key prop */}
              <h2>{stage.title}</h2>
              <ul>
                {stage.tasks.map((task) => ( // task 對象已經有 key 屬性
                  <li
                    key={task.key} // 使用 task 對象中的 key 屬性作為 key prop
                    className={task.done ? 'done' : 'not-done'}
                    // 點擊事件中使用 task.key 來找到正確的索引以切換狀態
                    onClick={() => toggleTask(sIdx, taskStages[sIdx].tasks.findIndex(t => t.key === task.key))}
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