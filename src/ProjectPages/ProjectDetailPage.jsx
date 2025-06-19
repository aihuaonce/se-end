import React, { useEffect, useState } from 'react'; // 移除 useContext，因為我們直接從 localStorage 讀取
import '../styles/ProjectStages.css';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';

const API_URL = 'http://localhost:5713';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- 修改 currentUser 的獲取方式 ---
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // 確保 parsedUser 有 username 屬性
        if (parsedUser && parsedUser.username) {
          setCurrentUser({ name: parsedUser.username, id: parsedUser.id, role: parsedUser.role }); // 將 username 映射到 name
        } else {
          console.warn("從 localStorage 獲取的用戶對象缺少 username 屬性:", parsedUser);
          setCurrentUser(null); // 或者設置一個預設值，或處理未登入狀態
        }
      } catch (error) {
        console.error("解析 localStorage 中的用戶數據失敗:", error);
        setCurrentUser(null);
        // 可能需要處理 token 失效或數據損壞的情況，例如清除 localStorage 並要求重新登入
        // localStorage.removeItem('user');
        // localStorage.removeItem('token');
        // navigate('/login'); // 或顯示登入模態框
      }
    } else {
      // 如果 localStorage 中沒有用戶信息，表示未登入或已登出
      // 根據您的 App.jsx 邏輯，此時應該已經處理了跳轉或顯示登入模態框
      // 但為保險起見，也可以在此處設置 currentUser 為 null
      setCurrentUser(null);
      console.log("ProjectDetailPage: localStorage 中沒有用戶信息。");
    }
  }, []); // 空依賴數組，只在組件掛載時執行一次

  // ... (組件的其餘部分，例如 project, projectTasks, isEditing 等 state 不變) ...

  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [categorizedTasks, setCategorizedTasks] = useState([]);

  const [isEditing, setIsEditing] = useState(false); // 主頁面編輯模式
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // 任務完成表單相關
  const [showCompleteTaskForm, setShowCompleteTaskForm] = useState(false);
  const [completeTaskData, setCompleteTaskData] = useState({ actual_end: '', remark: '' });

  // 任務詳情編輯相關
  const [isTaskDetailEditing, setIsTaskDetailEditing] = useState(false);
  const [editableTaskData, setEditableTaskData] = useState(null);

  const initialStages = [
    { title: '婚禮前 9-18 個月', tasks: ['選定婚期','確定婚宴場地','找婚顧','初估人數','確定婚禮形式'] },
    { title: '婚禮前 3-9 個月', tasks: ['找新娘秘書','找婚禮攝影','找婚顧拍婚紗','討論佈置風格'] },
    { title: '婚禮前 3 個月', tasks: ['訂喜餅','挑婚戒','挑婚紗禮服','主持人','婚禮MV','設計喜帖','婚禮小物','規劃婚禮流程','協助人員名單','決定人員','統計賓客','規劃蜜月'] },
    { title: '婚禮前 2 個月', tasks: ['西服','親友服裝','寄喜帖','溝通婚禮儀式','採買婚禮用品','租禮車'] },
    { title: '婚禮前 1 個月', tasks: ['新娘試妝','婚禮佈置','試菜','主持溝通','賓客名單&座位表','贈禮道具','當日路線'] },
    { title: '婚禮前 1-2 週', tasks: ['結婚誓詞','彩排驗收','確認桌數','確認廠商','確認用品','紅包表','禮車表','人員通知','婚前保養','家長會議'] },
  ];

  useEffect(() => {
    const loadProjectData = async () => {
      if (!currentUser && !localStorage.getItem('user')) {
        // 如果 useEffect 獲取 currentUser 之前，用戶數據還沒準備好，
        // 且 localStorage 裡也沒有，可能需要等待或處理。
        // 但通常 App.jsx 會先處理未登入情況。
        console.log("ProjectDetailPage: 等待 currentUser 或用戶未登入。");
        // setLoading(false); // 如果未登入不應繼續載入
        return;
      }
      setLoading(true);
      await fetchProjectDetails();
      await fetchProjectTasks();
      setLoading(false);
    };
    if (id) {
      loadProjectData();
    }
  }, [id, currentUser]); // 將 currentUser 加入依賴，確保獲取到用戶後再觸發數據加載

  useEffect(() => {
    if (projectTasks.length > 0 || !loading) {
      categorizeAndSetTasks(projectTasks);
    }
  }, [projectTasks, loading, project]);

  const fetchProjectDetails = async () => {
    if (!id) return;
    setNotFound(false);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        if (res.status === 404) {
            setNotFound(true);
            return;
        }
        throw new Error(errorBody.message || `HTTP 錯誤：${res.status} ${res.statusText}`);
      }
      const jsonResponse = await res.json();
      if (!jsonResponse.success || !jsonResponse.data || Object.keys(jsonResponse.data).length === 0) {
        setNotFound(true);
      } else {
        setProject(jsonResponse.data);
        setNote(jsonResponse.data.couple_remark || '');
      }
    } catch (err) {
      setError(`無法載入專案資料：${err.message}`);
      setNotFound(true);
    }
  };

  const fetchProjectTasks = async () => {
    if (!id) return;
    // setError(null); // 避免頻繁重置主錯誤
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/tasks`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        if (res.status === 404 && notFound) { // 如果專案本身404，任務也獲取不到
            setProjectTasks([]);
            return;
        }
        throw new Error(errorBody.message || `HTTP 錯誤：${res.status} ${res.statusText}`);
      }
      const jsonResponse = await res.json();
      if (!jsonResponse.success || !Array.isArray(jsonResponse.data)) {
        setProjectTasks([]);
      } else {
        setProjectTasks(jsonResponse.data);
      }
    } catch (err) {
      console.error("獲取任務列表失敗:", err.message); // 更具體的錯誤日誌
      setProjectTasks([]);
    }
  };

  const categorizeAndSetTasks = (tasksFromDB) => {
    const updatedStages = initialStages.map(stage => ({
      ...stage,
      tasks: stage.tasks.map(taskName => {
        const dbTask = tasksFromDB.find(dbT => dbT.task_name === taskName);
        return {
          name: taskName,
          task_id: dbTask ? dbTask.task_id : null,
          project_id: dbTask ? dbTask.project_id : (project ? project.project_id : null),
          task_content: dbTask ? dbTask.task_content : null,
          responsible_staff: dbTask ? dbTask.responsible_staff : null,
          expected_start: dbTask ? dbTask.expected_start : null,
          expected_end: dbTask ? dbTask.expected_end : null,
          actual_start: dbTask ? dbTask.actual_start : null,
          actual_end: dbTask ? dbTask.actual_end : null,
          task_status: dbTask ? dbTask.task_status : '尚未開始',
          priority: dbTask ? dbTask.priority : '中',
          remark: dbTask ? dbTask.remark : null,
          key: dbTask ? `db-${dbTask.task_id}` : `default-${taskName}-${project ? project.project_id : 'temp'}-${Math.random()}`
        };
      })
    }));
    const otherTasks = tasksFromDB.filter(dbTask =>!initialStages.some(stage => stage.tasks.includes(dbTask.task_name))).map(dbTask => ({ name: dbTask.task_name, ...dbTask, key: `db-${dbTask.task_id}`}));
    if (otherTasks.length > 0) { updatedStages.push({ title: '其他任務 (未分類)', tasks: otherTasks }); }
    setCategorizedTasks(updatedStages);
  };

  const openTaskDetailModal = (task) => {
    setSelectedTask(task);
    setEditableTaskData({ ...task });
    setIsTaskDetailEditing(false);
    setShowCompleteTaskForm(false);
    setCompleteTaskData({ actual_end: '', remark: task.remark || '' });
    setShowTaskDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskDetailModal(false);
    setShowCompleteTaskForm(false);
    setIsTaskDetailEditing(false);
    setSelectedTask(null);
    setEditableTaskData(null);
  };

  const prepareCompleteTaskForm = () => {
    if (!selectedTask) return;
    setCompleteTaskData({
      actual_end: moment().format('YYYY-MM-DD'),
      remark: selectedTask.remark || ''
    });
    setShowCompleteTaskForm(true);
    setIsTaskDetailEditing(false);
  };

  const handleConfirmCompleteTask = async () => {
    if (!selectedTask || !isEditing) { alert("請先進入編輯模式。"); return; }
    if (!project || !project.project_id) { alert("專案資訊載入不完整，無法操作任務。"); return; }
    if (!currentUser) { alert("無法獲取當前用戶信息，請重新登入。"); return;} // 增加 currentUser 檢查
    if (!completeTaskData.actual_end) { alert("請輸入實際完成日期。"); return; }

    const taskPayload = {
      project_id: project.project_id,
      task_name: selectedTask.name,
      task_status: '已完成',
      actual_end: moment(completeTaskData.actual_end).format('YYYY-MM-DD'),
      remark: completeTaskData.remark || null,
      task_content: selectedTask.task_content || null,
      priority: selectedTask.priority || '中',
      expected_start: selectedTask.expected_start ? moment(selectedTask.expected_start).format('YYYY-MM-DD') : null,
      expected_end: selectedTask.expected_end ? moment(selectedTask.expected_end).format('YYYY-MM-DD') : null,
      responsible_staff: selectedTask.task_id ? (selectedTask.responsible_staff || currentUser.name) : currentUser.name, // 如果是現有任務且無負責人，也用當前用戶
    };

    try {
      let response;
      let successMessage = '';
      if (selectedTask.task_id) {
        const updatesForPut = {
          task_status: '已完成', actual_end: taskPayload.actual_end, remark: taskPayload.remark,
          responsible_staff: taskPayload.responsible_staff,
        };
        response = await fetch(`${API_URL}/api/projects/tasks/${selectedTask.task_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatesForPut),
        });
        successMessage = '✅ 任務已更新為完成！';
      } else {
        response = await fetch(`${API_URL}/api/projects/tasks`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskPayload),
        });
        successMessage = '✅ 新任務已創建並標記為完成！';
      }
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: '操作失敗' }));
        throw new Error(errorBody.message || `HTTP 錯誤：${response.status}`);
      }
      alert(successMessage);
      fetchProjectTasks();
      handleCloseModal();
    } catch (err) {
      console.error('❌ 操作任務失敗 (handleConfirmCompleteTask):', err);
      alert(`操作任務失敗: ${err.message}`);
    }
  };

  const handleMarkAsNotStarted = async () => {
    if (!selectedTask || !selectedTask.task_id || !isEditing) { alert("任務不存在或未處於編輯模式。"); return; }
    if (window.confirm(`您確定要將任務 "${selectedTask.name}" 標記為「尚未開始」嗎？`)) {
      const updates = { task_status: '尚未開始', actual_end: null };
      try {
        const response = await fetch(`${API_URL}/api/projects/tasks/${selectedTask.task_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ message: '更新失敗' }));
          throw new Error(errorBody.message || `HTTP 錯誤：${response.status}`);
        }
        alert('✅ 任務已標記為尚未開始！');
        fetchProjectTasks();
        handleCloseModal();
      } catch (err) {
        console.error('❌ 更新任務為尚未開始失敗:', err);
        alert(`更新任務失敗: ${err.message}`);
      }
    }
  };

  const handleTaskDetailInputChange = (e) => {
    const { name, value } = e.target;
    setEditableTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveTaskDetails = async () => {
    if (!editableTaskData || !editableTaskData.task_id || !isEditing) {
        alert("無法保存，任務不存在、未處於編輯模式或主專案非編輯模式。");
        return;
    }
    if (!currentUser) { alert("無法獲取當前用戶信息，請重新登入。"); return;} // 增加 currentUser 檢查

    const updates = {
      task_name: editableTaskData.task_name,
      task_content: editableTaskData.task_content,
      responsible_staff: editableTaskData.responsible_staff, // 允許用戶手動修改
      expected_start: editableTaskData.expected_start ? moment(editableTaskData.expected_start).format('YYYY-MM-DD') : null,
      expected_end: editableTaskData.expected_end ? moment(editableTaskData.expected_end).format('YYYY-MM-DD') : null,
      actual_start: editableTaskData.actual_start ? moment(editableTaskData.actual_start).format('YYYY-MM-DD') : null,
      task_status: editableTaskData.task_status,
      priority: editableTaskData.priority,
      remark: editableTaskData.remark,
    };

    try {
      const response = await fetch(`${API_URL}/api/projects/tasks/${editableTaskData.task_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: '任務更新失敗' }));
        throw new Error(errorBody.message || `HTTP 錯誤：${response.status}`);
      }
      alert('✅ 任務詳情已更新！');
      await fetchProjectTasks(); // 等待任務列表刷新完成
      // 更新 selectedTask 以在彈窗中立即反映更改
      // 需要在 projectTasks 更新後再執行
      const updatedTaskFromList = projectTasks.find(t => t.task_id === editableTaskData.task_id);
      if (updatedTaskFromList) {
          setSelectedTask(updatedTaskFromList); // 用刷新後的列表數據更新
          setEditableTaskData({...updatedTaskFromList}); // 同時更新可編輯數據
      } else {
           // 理論上刷新後應該能找到，如果找不到，可能是異步問題，或用本地數據應急
          setSelectedTask(prev => ({...prev, ...updates}));
          setEditableTaskData(prev => ({...prev, ...updates}));
      }
      setIsTaskDetailEditing(false); // 退出任務編輯模式

    } catch (err) {
      console.error('❌ 更新任務詳情失敗:', err);
      alert(`更新任務詳情失敗: ${err.message}`);
    }
  };

  const handleSaveProjectDetails = async () => {
    if (!isEditing || !project) { alert('請先點擊編輯按鈕或專案資料未載入。'); return; };
    let formattedWeddingDate = project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : null;
    let formattedWeddingTime = project.wedding_time ? moment(project.wedding_time, 'HH:mm:ss').format('HH:mm:ss') : null;
    const updatedProjectData = {
        groom_name: project.groom_name, bride_name: project.bride_name,
        phone: project.couple_phone, email: project.couple_email,
        wedding_date: formattedWeddingDate, wedding_time: formattedWeddingTime,
        wedding_place: project.wedding_place, remark: note,
        plan_id: project.plan_id ? parseInt(project.plan_id) : null,
        budget_id: project.budget_id ? parseInt(project.budget_id) : null,
        wedding_style: project.wedding_style, horoscope: project.horoscope,
        blood_type: project.blood_type, favorite_color: project.favorite_color,
        favorite_season: project.favorite_season, beliefs_description: project.beliefs_description,
        needs_description: project.needs_description,
        total_budget: project.total_budget ? parseFloat(project.total_budget) : null,
        project_status: project.project_status,
        google_sheet_link: project.google_sheet_link,
    };
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProjectData)
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: '未知更新失敗' }));
        throw new Error(errorBody.message || `更新失敗: ${response.status} ${response.statusText}`);
      }
      alert('✅ 專案資料已更新');
    } catch (error) {
      alert(`❌ 更新失敗: ${error.message}`);
    } finally {
      setIsEditing(false);
      fetchProjectDetails();
    }
  };

  // --- 渲染部分 ---
  // 增加 currentUser 檢查，如果 currentUser 未定義（例如正在從 localStorage 加載或未登入）
  // 則顯示加載中或提示信息，避免後續代碼因 currentUser.name 出錯
  if (!currentUser && localStorage.getItem('user')) {
    // 仍在嘗試從 localStorage 加載用戶，或者 App.jsx 的登入邏輯尚未完成
    return <p className="p-6 text-gray-500">正在加載用戶資訊...</p>;
  }
  // 如果 App.jsx 已經處理了未登入跳轉，這裡可能不需要額外的未登入提示
  // 但如果直接訪問此頁面且未登入，currentUser 會是 null
  if (!currentUser && !localStorage.getItem('token')) {
    // 這裡的邏輯取決於您希望如何處理未授權訪問
    // App.jsx 應該已經處理了跳轉到登入模態框
    return <p className="p-6 text-red-500">請先登入以查看專案詳情。</p>;
  }


  if (loading && !project) return <p className="p-6 text-gray-500">📦 專案資料載入中...</p>;
  if (error) return <p className="p-6 text-red-500">❌ {error}</p>;
  if (notFound || !project) return <p className="p-6 text-red-500">❌ 專案不存在或尚無資料</p>;

  // ... (返回 JSX 的其餘部分，與上一版本相同，確保使用 currentUser.name)
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate('/projectall')} className="text-[#cb8a90] hover:underline">
          ← 回到專案列表
        </button>
        <div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="bg-yellow-400 text-white font-semibold px-4 py-2 rounded mr-2 hover:bg-yellow-500">
              編輯專案資料
            </button>
          )}
          {isEditing && (
              <button onClick={handleSaveProjectDetails} className="bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700">
                保存專案資料
              </button>
          )}
          {isEditing && (
              <button onClick={() => { setIsEditing(false); fetchProjectDetails(); }}
                      className="bg-gray-400 text-white font-semibold px-4 py-2 rounded ml-2 hover:bg-gray-500">
                取消編輯
              </button>
          )}
        </div>
      </div>

      <table className="table-auto border w-full mb-6 text-sm">
        <tbody>
          <tr>
            <th className="border px-4 py-2">專案ID</th><td className="border px-4 py-2">{project.project_id}</td>
            <th className="border px-4 py-2">新郎</th><td className="border px-4 py-2">{isEditing ? <input value={project.groom_name || ''} onChange={e => setProject({ ...project, groom_name: e.target.value })} className="w-full border px-1" /> : project.groom_name}</td>
            <th className="border px-4 py-2">新娘</th><td className="border px-4 py-2">{isEditing ? <input value={project.bride_name || ''} onChange={e => setProject({ ...project, bride_name: e.target.value })} className="w-full border px-1" /> : project.bride_name}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2">聯絡人</th><td className="border px-4 py-2">{`${project.groom_name || ''} & ${project.bride_name || ''}`}</td>
            <th className="border px-4 py-2">電話</th><td className="border px-4 py-2">{isEditing ? <input value={project.couple_phone || ''} onChange={e => setProject({ ...project, couple_phone: e.target.value })} className="w-full border px-1" /> : project.couple_phone}</td>
            <th className="border px-4 py-2">Email</th><td className="border px-4 py-2">{isEditing ? <input value={project.couple_email || ''} onChange={e => setProject({ ...project, couple_email: e.target.value })} className="w-full border px-1" /> : project.couple_email}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2">婚期</th><td className="border px-4 py-2">{isEditing ? <input type="date" value={project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : ''} onChange={e => setProject({ ...project, wedding_date: e.target.value })} className="w-full border px-1"/> : (project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : '未設定')}</td>
            <th className="border px-4 py-2">地點</th><td className="border px-4 py-2">{isEditing ? <input value={project.wedding_place || ''} onChange={e => setProject({ ...project, wedding_place: e.target.value })} className="w-full border px-1" /> : project.wedding_place}</td>
            <th className="border px-4 py-2">預算ID</th><td className="border px-4 py-2">{isEditing ? <input type="number" value={project.budget_id || ''} onChange={e => setProject({ ...project, budget_id: e.target.value })} className="w-full border px-1" /> : project.budget_id}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2">方案ID</th><td className="border px-4 py-2">{isEditing ? <input type="number" value={project.plan_id || ''} onChange={e => setProject({ ...project, plan_id: e.target.value })} className="w-full border px-1" /> : project.plan_id}</td>
            <th className="border px-4 py-2">風格</th><td className="border px-4 py-2">{isEditing ? <input value={project.wedding_style || ''} onChange={e => setProject({ ...project, wedding_style: e.target.value })} className="w-full border px-1" /> : project.wedding_style}</td>
            <th className="border px-4 py-2">建立時間</th><td className="border px-4 py-2">{project.project_build_time ? moment(project.project_build_time).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2">更新時間</th><td className="border px-4 py-2">{project.project_update_time ? moment(project.project_update_time).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</td>
            <th className="border px-4 py-2">Google Sheet Link</th>
            <td className="border px-4 py-2" colSpan="3">
              {isEditing ? <input type="text" value={project.google_sheet_link || ''} onChange={e => setProject({ ...project, google_sheet_link: e.target.value })} className="w-full border px-1" placeholder="https://docs.google.com/..."/>
               : (project.google_sheet_link ? <a href={project.google_sheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{project.google_sheet_link}</a> : '未設定')}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">星座</th><td className="border px-4 py-2">{isEditing ? <input value={project.horoscope || ''} onChange={e => setProject({ ...project, horoscope: e.target.value })} className="w-full border px-1" /> : project.horoscope}</td>
            <th className="border px-4 py-2">血型</th><td className="border px-4 py-2">{isEditing ? <input value={project.blood_type || ''} onChange={e => setProject({ ...project, blood_type: e.target.value })} className="w-full border px-1" /> : project.blood_type}</td>
            <th className="border px-4 py-2">喜歡的顏色</th><td className="border px-4 py-2">{isEditing ? <input value={project.favorite_color || ''} onChange={e => setProject({ ...project, favorite_color: e.target.value })} className="w-full border px-1" /> : project.favorite_color}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2">喜歡的季節</th><td className="border px-4 py-2">{isEditing ? <input value={project.favorite_season || ''} onChange={e => setProject({ ...project, favorite_season: e.target.value })} className="w-full border px-1" /> : project.favorite_season}</td>
            <th className="border px-4 py-2">信仰/禁忌</th><td className="border px-4 py-2" colSpan="3">{isEditing ? <input value={project.beliefs_description || ''} onChange={e => setProject({ ...project, beliefs_description: e.target.value })} className="w-full border px-1" /> : project.beliefs_description}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2">其他需求</th><td className="border px-4 py-2" colSpan="5">{isEditing ? <textarea value={project.needs_description || ''} onChange={e => setProject({ ...project, needs_description: e.target.value })} rows="2" className="w-full border px-1" /> : project.needs_description}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-700 mb-2">顧客需求細節 (couple_remark)：</label>
        <textarea rows="4" className="w-full border rounded p-2" value={note} onChange={(e) => setNote(e.target.value)} disabled={!isEditing} />
      </div>

      <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-[#cb8a90]">專案排程</h2></div>

      {categorizedTasks.length > 0 ? (
        categorizedTasks.map((stage, sIdx) => (
          <div className="stage mb-6 border border-gray-200 rounded-lg shadow-sm" key={`${stage.title}-${sIdx}`}>
            <h3 className="bg-gray-100 text-gray-700 p-3 font-semibold rounded-t-lg">{stage.title}</h3>
            <ul className="divide-y divide-gray-100">
              {stage.tasks.length > 0 ? (
                stage.tasks.map((task) => (
                  <li key={task.key}
                      className={`flex items-center p-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${task.task_status === '已完成' ? 'bg-green-100' : ''}`}
                      onClick={() => openTaskDetailModal(task)}>
                    <div className="flex-grow">
                      <span className={`text-lg font-medium ${task.task_status === '已完成' ? 'text-green-800' : 'text-gray-900'}`}>
                        {task.name}
                        {task.task_status && <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            task.task_status === '已完成' ? 'bg-green-200 text-green-900' :
                            task.task_status === '進行中' ? 'bg-blue-200 text-blue-900' :
                            task.task_status === '延遲' ? 'bg-red-200 text-red-900' :
                            'bg-gray-200 text-gray-900'
                        }`}>{task.task_status}</span>}
                        {task.task_status === '已完成' && <span className="ml-2 text-green-600">✔</span>}
                      </span>
                      {task.responsible_staff && <div className="text-sm text-gray-600">負責人: {task.responsible_staff}</div>}
                      {task.task_status === '已完成' && task.actual_end && (<div className="text-sm text-green-700">完成於: {moment(task.actual_end).format('YYYY-MM-DD')}</div>)}
                    </div>
                  </li>
                ))
              ) : ( <li className="p-3 text-gray-500 italic">此階段目前沒有任務。</li> )}
            </ul>
          </div>
        ))
      ) : ( <p className="text-gray-500 mb-6">目前沒有排程任務，或仍在載入中...</p> )}

      {showTaskDetailModal && selectedTask && editableTaskData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {showCompleteTaskForm ? (
                <>
                    <h3 className="text-xl font-bold mb-4 text-[#cb8a90]">完成任務：{selectedTask.name}</h3>
                    <div className="mb-3">
                        <label htmlFor="actual_end_date" className="block text-sm font-medium text-gray-700 mb-1">實際完成日期：</label>
                        <input type="date" id="actual_end_date" value={completeTaskData.actual_end}
                                onChange={e => setCompleteTaskData({...completeTaskData, actual_end: e.target.value})}
                                className="w-full border border-gray-300 rounded p-2 text-sm"/>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="completion_remark" className="block text-sm font-medium text-gray-700 mb-1">備註（選填）：</label>
                        <textarea id="completion_remark" rows="3" value={completeTaskData.remark}
                                    onChange={e => setCompleteTaskData({...completeTaskData, remark: e.target.value})}
                                    className="w-full border border-gray-300 rounded p-2 text-sm"/>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={handleConfirmCompleteTask} className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700">
                        確認完成此任務
                        </button>
                        <button type="button" onClick={() => setShowCompleteTaskForm(false)} className="bg-gray-400 text-white font-bold py-2 px-4 rounded hover:bg-gray-500">
                        取消
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-[#cb8a90] flex-grow">
                        任務詳情：{isTaskDetailEditing && selectedTask.task_id ? (
                            <input type="text" name="task_name" value={editableTaskData.name} onChange={handleTaskDetailInputChange} className="font-bold text-xl border-b-2 border-pink-300 focus:border-pink-500 outline-none w-auto inline-block" />
                        ) : (
                            selectedTask.name
                        )}
                        </h3>
                        {isEditing && selectedTask.task_id && !isTaskDetailEditing && (
                        <button onClick={() => setIsTaskDetailEditing(true)} className="ml-4 text-sm bg-blue-500 hover:bg-blue-700 text-white py-1 px-3 rounded whitespace-nowrap">
                            編輯此任務
                        </button>
                        )}
                    </div>

                    <div className="mb-4 text-sm text-gray-700 space-y-3">
                        <div><strong>任務內容:</strong> {isTaskDetailEditing && selectedTask.task_id ? <textarea name="task_content" value={editableTaskData.task_content || ''} onChange={handleTaskDetailInputChange} rows="2" className="w-full border rounded p-1.5 text-sm mt-1"/> : (selectedTask.task_content || '無')}</div>
                        <div>
                            <strong>負責人:</strong>
                            {isTaskDetailEditing && selectedTask.task_id ? (
                                <div className="flex items-center mt-1">
                                    <input type="text" name="responsible_staff" value={editableTaskData.responsible_staff || ''} onChange={handleTaskDetailInputChange} className="w-full border rounded p-1.5 text-sm"/>
                                    {currentUser && <button onClick={() => setEditableTaskData(prev => ({...prev, responsible_staff: currentUser.name}))} className="ml-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-2 rounded whitespace-nowrap">指派給我</button>}
                                </div>
                            ) : (selectedTask.responsible_staff || '無')}
                        </div>
                        <div><strong>預計開始:</strong> {isTaskDetailEditing && selectedTask.task_id ? <input type="date" name="expected_start" value={editableTaskData.expected_start ? moment(editableTaskData.expected_start).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="w-full border rounded p-1.5 text-sm mt-1"/> : (selectedTask.expected_start ? moment(selectedTask.expected_start).format('YYYY-MM-DD') : '無')}</div>
                        <div><strong>預計結束:</strong> {isTaskDetailEditing && selectedTask.task_id ? <input type="date" name="expected_end" value={editableTaskData.expected_end ? moment(editableTaskData.expected_end).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="w-full border rounded p-1.5 text-sm mt-1"/> : (selectedTask.expected_end ? moment(selectedTask.expected_end).format('YYYY-MM-DD') : '無')}</div>
                        <div><strong>實際開始:</strong> {isTaskDetailEditing && selectedTask.task_id ? <input type="date" name="actual_start" value={editableTaskData.actual_start ? moment(editableTaskData.actual_start).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="w-full border rounded p-1.5 text-sm mt-1"/> : (selectedTask.actual_start ? moment(selectedTask.actual_start).format('YYYY-MM-DD') : '無')}</div>
                        <div><strong>實際結束:</strong> {selectedTask.actual_end ? moment(selectedTask.actual_end).format('YYYY-MM-DD') : '無'}</div>
                        <div><strong>任務狀態:</strong>
                        {isTaskDetailEditing && selectedTask.task_id && selectedTask.task_status !== '已完成' ? (
                            <select name="task_status" value={editableTaskData.task_status} onChange={handleTaskDetailInputChange} className="w-full border rounded p-1.5 text-sm mt-1">
                            <option value="尚未開始">尚未開始</option>
                            <option value="進行中">進行中</option>
                            <option value="延遲">延遲</option>
                            </select>
                        ) : (
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ selectedTask.task_status === '已完成' ? 'bg-green-200 text-green-900' : selectedTask.task_status === '進行中' ? 'bg-blue-200 text-blue-900' : selectedTask.task_status === '延遲' ? 'bg-red-200 text-red-900' : 'bg-gray-200 text-gray-900' }`}>{selectedTask.task_status || '未定義'}</span>
                        )}
                        </div>
                        <div><strong>優先級:</strong>
                        {isTaskDetailEditing && selectedTask.task_id ? (
                            <select name="priority" value={editableTaskData.priority} onChange={handleTaskDetailInputChange} className="w-full border rounded p-1.5 text-sm mt-1">
                            <option value="高">高</option>
                            <option value="中">中</option>
                            <option value="低">低</option>
                            </select>
                        ) : (selectedTask.priority || '無')}
                        </div>
                        <div><strong>備註:</strong> {isTaskDetailEditing && selectedTask.task_id ? <textarea name="remark" value={editableTaskData.remark || ''} onChange={handleTaskDetailInputChange} rows="2" className="w-full border rounded p-1.5 text-sm mt-1"/> : (selectedTask.remark || '無')}</div>
                        <p className="text-xs text-gray-500 pt-2">任務ID: {selectedTask.task_id || 'N/A (新任務)'}</p>
                    </div>

                    <div className="flex justify-end gap-2 mt-5">
                        {isTaskDetailEditing && selectedTask.task_id ? (
                        <>
                            <button onClick={handleSaveTaskDetails} className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700">
                            保存任務
                            </button>
                            <button type="button" onClick={() => { setIsTaskDetailEditing(false); setEditableTaskData({...selectedTask});}} className="bg-gray-400 text-white font-bold py-2 px-4 rounded hover:bg-gray-500">
                            取消編輯
                            </button>
                        </>
                        ) : (
                        <>
                            {isEditing && (
                            <>
                                {selectedTask.task_status === '已完成' && selectedTask.task_id ? (
                                <button onClick={handleMarkAsNotStarted} className="py-2 px-4 rounded font-bold bg-red-500 text-white hover:bg-red-700">
                                    標記為尚未開始
                                </button>
                                ) : (
                                selectedTask.task_status !== '已完成' && (
                                    <button onClick={prepareCompleteTaskForm} className="py-2 px-4 rounded font-bold bg-green-600 text-white hover:bg-green-700">
                                    標記為已完成
                                    </button>
                                )
                                )}
                            </>
                            )}
                        </>
                        )}
                        <button type="button" onClick={handleCloseModal} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-700">
                        關閉
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;