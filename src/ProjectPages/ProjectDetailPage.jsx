import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../styles/ProjectStages.css';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/zh-cn';

moment.locale('zh-cn'); // 設定 moment 的語系為繁體中文，這樣日期格式會更符合台灣習慣

const API_URL = 'http://localhost:5713';

const ProjectDetailPage = () => {
  // ... (existing states and other hooks remain unchanged)
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [categorizedTasks, setCategorizedTasks] = useState([]); // 這個 state 會存儲帶有動態標題的階段
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [editableTaskInModal, setEditableTaskInModal] = useState(null);
  const [showCompleteTaskForm, setShowCompleteTaskForm] = useState(false);
  const [completeTaskFormData, setCompleteTaskFormData] = useState({ actual_end: '', remark: '' });
  const [isTaskBeingEditedInModal, setIsTaskBeingEditedInModal] = useState(false);


  // 獲取當前登入用戶信息
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.username) {
          setCurrentUser({ name: parsedUser.username, id: parsedUser.id, role: parsedUser.role });
        } else {
          console.warn("localStorage 中的用戶對象缺少 username:", parsedUser);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("解析 localStorage 用戶數據失敗:", error);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null); // 未登入
    }
  }, []);

  // 定義任務階段樣板
  const initialStages = React.useMemo(() => [
    { title: '婚禮前 9-18 個月', tasks: ['選定婚期','確定婚宴場地','找婚顧','初估人數','確定婚禮形式'] },
    { title: '婚禮前 3-9 個月', tasks: ['找新娘秘書','找婚禮攝影','找婚顧拍婚紗','討論佈置風格'] },
    { title: '婚禮前 3 個月', tasks: ['訂喜餅','挑婚戒','挑婚紗禮服','主持人','婚禮MV','設計喜帖','婚禮小物','規劃婚禮流程','協助人員名單','決定人員','統計賓客','規劃蜜月'] },
    { title: '婚禮前 2 個月', tasks: ['西服','親友服裝','寄喜帖','溝通婚禮儀式','採買婚禮用品','租禮車'] },
    { title: '婚禮前 1 個月', tasks: ['新娘試妝','婚禮佈置','試菜','主持溝通','賓客名單&座位表','贈禮道具','當日路線'] },
    { title: '婚禮前 1-2 週', tasks: ['結婚誓詞','彩排驗收','確認桌數','確認廠商','確認用品','紅包表','禮車表','人員通知','婚前保養','家長會議'] },
  ], []);


  // API 請求輔助函數 (如果後端需要 token)
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, []);


  // 獲取專案詳情
  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    setProjectNotFound(false);
    setApiError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/projects/${projectId}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        if (res.status === 404) { setProjectNotFound(true); return; }
        throw new Error(errorBody.message || `HTTP 錯誤 ${res.status}`);
      }
      const jsonResponse = await res.json();
      if (!jsonResponse.success || !jsonResponse.data) {
        setProjectNotFound(true); throw new Error('專案數據格式不正確');
      }
      setProject(jsonResponse.data);
      setNote(jsonResponse.data.couple_remark || '');
    } catch (err) {
      setApiError(`無法載入專案資料：${err.message}`);
      setProjectNotFound(true);
    }
  }, [projectId, fetchWithAuth]);

  // 獲取專案任務
  const fetchProjectTasks = useCallback(async () => {
    if (!projectId) return;
    // 不重置 apiError, 避免覆蓋主專案的錯誤
    try {
      const res = await fetchWithAuth(`${API_URL}/api/projects/${projectId}/tasks`);
      if (!res.ok) {
        // 如果專案本身404，任務也獲取不到，此時 projectNotFound 應已為 true
        if (res.status === 404 && projectNotFound) { setProjectTasks([]); return; }
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        throw new Error(errorBody.message || `HTTP 錯誤 ${res.status}`);
      }
      const jsonResponse = await res.json();
      if (!jsonResponse.success || !Array.isArray(jsonResponse.data)) {
        throw new Error('任務數據格式不正確');
      }
      setProjectTasks(jsonResponse.data);
    } catch (err) {
      console.error("獲取任務列表失敗:", err.message);
      setApiError(prev => prev ? `${prev}\n無法載入任務資料：${err.message}` : `無法載入任務資料：${err.message}`);
      setProjectTasks([]);
    }
  }, [projectId, projectNotFound, fetchWithAuth]);


  // 頁面加載數據
  useEffect(() => {
    const loadAllData = async () => {
      if (!localStorage.getItem('token')) { // 如果沒有 token，表示未登入
        setLoading(false);
        // App.jsx 應處理導向登入，這裡可以加個保險
        if (!currentUser) navigate('/'); // 或顯示登入提示
        return;
      }
      setLoading(true);
      await fetchProjectDetails();
      // 只有在專案存在時才獲取任務
      if (!projectNotFound) {
        await fetchProjectTasks();
      }
      setLoading(false);
    };
    if (projectId) {
      loadAllData();
    }
  }, [projectId, currentUser, fetchProjectDetails, fetchProjectTasks, navigate, projectNotFound]); // currentUser 變化也觸發


  // 分類任務
  const categorizeAndSetTasks = useCallback((tasksFromDBOrNull) => {
    const tasksFromDB = tasksFromDBOrNull || [];
    const currentProjectId = project ? project.project_id : null;
    const weddingDate = project && project.wedding_date ? moment(project.wedding_date) : null;

    const updatedStages = initialStages.map(stage => {
      let dynamicTitle = stage.title; // 預設為原始標題

      if (weddingDate && weddingDate.isValid()) {
        let startDate, endDate;
        const originalRelativeTitle = stage.title; // 儲存原始的「婚禮前...」標題

        if (originalRelativeTitle.includes('9-18 個月')) {
          startDate = weddingDate.clone().subtract(18, 'months').startOf('day');
          endDate = weddingDate.clone().subtract(9, 'months').endOf('day');
        } else if (originalRelativeTitle.includes('3-9 個月')) {
          startDate = weddingDate.clone().subtract(9, 'months').startOf('day');
          endDate = weddingDate.clone().subtract(3, 'months').endOf('day');
        } else if (originalRelativeTitle.includes('3 個月')) {
          // 假設為從3個月前開始到2個月前的區間
          startDate = weddingDate.clone().subtract(3, 'months').startOf('day');
          endDate = weddingDate.clone().subtract(2, 'months').endOf('day'); 
        } else if (originalRelativeTitle.includes('2 個月')) {
          // 假設為從2個月前開始到1個月前的區間
          startDate = weddingDate.clone().subtract(2, 'months').startOf('day');
          endDate = weddingDate.clone().subtract(1, 'month').endOf('day'); 
        } else if (originalRelativeTitle.includes('1 個月')) {
          // 假設為從1個月前開始到婚禮當天的區間
          startDate = weddingDate.clone().subtract(1, 'month').startOf('day');
          endDate = weddingDate.clone().endOf('day'); 
        } else if (originalRelativeTitle.includes('1-2 週')) {
          startDate = weddingDate.clone().subtract(2, 'weeks').startOf('day');
          endDate = weddingDate.clone().subtract(1, 'week').endOf('day');
        }
        
        if (startDate && endDate) {
          // 格式化日期範圍，例如 "2024/01/01 - 2024/03/31 (婚禮前 9-18 個月)"
          dynamicTitle = `${startDate.format('YYYY/MM/DD')} - ${endDate.format('YYYY/MM/DD')} (${originalRelativeTitle})`;
        }
      }

      return {
        ...stage,
        title: dynamicTitle, // 使用動態生成的標題
        tasks: stage.tasks.map(taskName => {
          const dbTask = tasksFromDB.find(dbT => dbT.task_name === taskName && dbT.project_id === currentProjectId);
          return { // 提供所有字段的預設值
            name: taskName, task_id: dbTask?.task_id || null,
            project_id: currentProjectId, // 新樣板任務應歸屬當前專案
            task_content: dbTask?.task_content || '',
            responsible_staff: dbTask?.responsible_staff || '',
            expected_start: dbTask?.expected_start || '', expected_end: dbTask?.expected_end || '',
            actual_start: dbTask?.actual_start || '', actual_end: dbTask?.actual_end || '',
            task_status: dbTask?.task_status || '尚未開始', priority: dbTask?.priority || '中',
            remark: dbTask?.remark || '',
            key: dbTask ? `db-${dbTask.task_id}` : `default-${taskName}-${currentProjectId || 'temp'}-${Math.random()}`
          };
        })
      };
    });

    const otherTasks = tasksFromDB
      .filter(dbTask => dbTask.project_id === currentProjectId && !initialStages.some(stage => stage.tasks.includes(dbTask.task_name)))
      .map(dbTask => ({ ...dbTask, key: `db-${dbTask.task_id}` }));

    if (otherTasks.length > 0) { updatedStages.push({ title: '其他任務 (未分類)', tasks: otherTasks }); }
    setCategorizedTasks(updatedStages);
  }, [initialStages, project]); // 依賴 project 以獲取 project_id 和 wedding_date

  useEffect(() => {
    // 只有在 project 數據加載完成後才進行任務分類
    if (project || !loading) {
      categorizeAndSetTasks(projectTasks);
    }
  }, [projectTasks, project, loading, categorizeAndSetTasks]);


  // 打開任務詳情彈窗
  const openTaskDetailModal = (task) => {
    // 創建一個完整的任務對象副本，確保所有字段都存在
    const taskForModal = {
      name: task.name || '', task_id: task.task_id || null,
      project_id: task.project_id || (project ? project.project_id : null),
      task_content: task.task_content || '',
      responsible_staff: task.responsible_staff || '',
      expected_start: task.expected_start || '', expected_end: task.expected_end || '',
      actual_start: task.actual_start || '', actual_end: task.actual_end || '',
      task_status: task.task_status || '尚未開始', priority: task.priority || '中',
      remark: task.remark || '',
    };
    setSelectedTaskForModal(taskForModal); // 存儲原始點擊的任務數據（或樣板數據）
    setEditableTaskInModal({ ...taskForModal }); // 創建一個可編輯的副本
    setIsTaskBeingEditedInModal(false); // 默認非編輯模式
    setShowCompleteTaskForm(false);
    setCompleteTaskFormData({ actual_end: '', remark: taskForModal.remark || '' });
    setShowTaskDetailModal(true);
  };

  // 關閉彈窗
  const handleCloseModal = () => {
    setShowTaskDetailModal(false); setShowCompleteTaskForm(false); setIsTaskBeingEditedInModal(false);
    setSelectedTaskForModal(null); setEditableTaskInModal(null);
  };

  // 準備完成任務表單
  const prepareCompleteTaskForm = () => {
    if (!editableTaskInModal) return; // 應該基於 editableTaskInModal
    if (!isEditing) { alert("請先進入主專案的「編輯專案資料」模式才能標記任務完成。"); return; }
    if (!currentUser) { alert("請先登入。"); return; }
    setCompleteTaskFormData({ actual_end: moment().format('YYYY-MM-DD'), remark: editableTaskInModal.remark || '' });
    setShowCompleteTaskForm(true);
    setIsTaskBeingEditedInModal(false);
  };

  // 確認完成任務
  const handleConfirmCompleteTask = async () => {
    if (!editableTaskInModal || !isEditing) { alert("請先進入主專案「編輯模式」。"); return; }
    if (!project?.project_id) { alert("專案ID缺失。"); return; }
    if (!currentUser) { alert("用戶未登入。"); return; }
    if (!completeTaskFormData.actual_end) { alert("請填寫實際完成日期。"); return; }

    const taskPayload = {
      project_id: project.project_id,
      task_name: editableTaskInModal.name, // 使用 editableTaskInModal 中的名稱
      task_status: '已完成',
      actual_end: moment(completeTaskFormData.actual_end).format('YYYY-MM-DD'),
      remark: completeTaskFormData.remark || null,
      task_content: editableTaskInModal.task_content || null,
      priority: editableTaskInModal.priority || '中',
      expected_start: editableTaskInModal.expected_start ? moment(editableTaskInModal.expected_start).format('YYYY-MM-DD') : null,
      expected_end: editableTaskInModal.expected_end ? moment(editableTaskInModal.expected_end).format('YYYY-MM-DD') : null,
      responsible_staff: editableTaskInModal.task_id 
                         ? (editableTaskInModal.responsible_staff || currentUser.name) 
                         : (currentUser.name), // 新任務直接指派，或已有任務無人負責則指派
    };

    try {
      let response; let successMessage = '';
      if (editableTaskInModal.task_id) { // 更新
        const updatesForPut = { task_status: '已完成', actual_end: taskPayload.actual_end, remark: taskPayload.remark, responsible_staff: taskPayload.responsible_staff };
        response = await fetchWithAuth(`${API_URL}/api/projects/tasks/${editableTaskInModal.task_id}`, { method: 'PUT', body: JSON.stringify(updatesForPut) });
        successMessage = '✅ 任務已更新為完成！';
      } else { // 創建
        response = await fetchWithAuth(`${API_URL}/api/projects/tasks`, { method: 'POST', body: JSON.stringify(taskPayload) });
        successMessage = '✅ 新任務已創建並標記為完成！';
      }
      if (!response.ok) { const e = await response.json().catch(()=>({message:'操作失敗'})); throw new Error(e.message); }
      alert(successMessage); await fetchProjectTasks(); handleCloseModal();
    } catch (err) { console.error('❌ 操作任務失敗:', err); alert(`操作任務失敗: ${err.message}`); }
  };

  // 標記為尚未開始
  const handleMarkAsNotStarted = async () => {
    if (!editableTaskInModal?.task_id || !isEditing) { alert("任務ID缺失或非主編輯模式。"); return; }
    if (!currentUser) { alert("用戶未登入。"); return; }
    if (window.confirm(`您確定要將任務 "${editableTaskInModal.name}" 標記為「尚未開始」嗎？`)) {
      const updates = { task_status: '尚未開始', actual_end: null };
      try {
        const response = await fetchWithAuth(`${API_URL}/api/projects/tasks/${editableTaskInModal.task_id}`, { method: 'PUT', body: JSON.stringify(updates) });
        if (!response.ok) { const e = await response.json().catch(()=>({message:'更新失敗'})); throw new Error(e.message); }
        alert('✅ 任務已標記為尚未開始！'); await fetchProjectTasks(); handleCloseModal();
      } catch (err) { console.error('❌ 標記未開始失敗:', err); alert(`標記未開始失敗: ${err.message}`); }
    }
  };

  // 任務詳情輸入框變更
  const handleTaskDetailInputChange = (e) => {
    const { name, value } = e.target;
    setEditableTaskInModal(prev => ({ ...prev, [name]: value }));
  };

  // 保存任務詳情 (創建或更新)
  const handleSaveTaskDetails = async () => {
    if (!editableTaskInModal) { alert("無可編輯任務數據。"); return; }
    if (!currentUser) { alert("請先登入。"); return; }
    if (!project?.project_id) { alert("專案ID缺失。"); return; }
    if (!editableTaskInModal.name?.trim()) { alert("任務名稱不能為空。"); return; }

    const payload = {
      project_id: project.project_id,
      task_name: editableTaskInModal.name,
      task_content: editableTaskInModal.task_content || '',
      responsible_staff: editableTaskInModal.responsible_staff || '',
      expected_start: editableTaskInModal.expected_start ? moment(editableTaskInModal.expected_start).format('YYYY-MM-DD') : null,
      expected_end: editableTaskInModal.expected_end ? moment(editableTaskInModal.expected_end).format('YYYY-MM-DD') : null,
      actual_start: editableTaskInModal.actual_start ? moment(editableTaskInModal.actual_start).format('YYYY-MM-DD') : null,
      actual_end: editableTaskInModal.actual_end ? moment(editableTaskInModal.actual_end).format('YYYY-MM-DD') : null,
      task_status: editableTaskInModal.task_status || '尚未開始',
      priority: editableTaskInModal.priority || '中',
      remark: editableTaskInModal.remark || '',
    };
    if (!editableTaskInModal.task_id && !payload.responsible_staff && currentUser.name) {
      payload.responsible_staff = currentUser.name; // 新任務自動指派
    }

    try {
      let response; let successMessage = '';
      if (editableTaskInModal.task_id) { // 更新
        const { project_id, ...updatePayload } = payload;
        response = await fetchWithAuth(`${API_URL}/api/projects/tasks/${editableTaskInModal.task_id}`, { method: 'PUT', body: JSON.stringify(updatePayload) });
        successMessage = '✅ 任務詳情已更新！';
      } else { // 創建
         const { task_id, ...createPayload } = payload; // POST 不應包含 task_id
        response = await fetchWithAuth(`${API_URL}/api/projects/tasks`, { method: 'POST', body: JSON.stringify(createPayload) });
        successMessage = '✅ 新任務已創建並保存！';
      }
      if (!response.ok) { const e = await response.json().catch(()=>({message:'保存失敗'})); throw new Error(e.message); }
      const responseData = await response.json();
      alert(successMessage);

      if (responseData?.success && responseData.data) {
        setSelectedTaskForModal(responseData.data); // 更新彈窗顯示的“原始”數據
        setEditableTaskInModal({ ...responseData.data }); // 更新編輯中的數據
      }
      await fetchProjectTasks(); // 刷新列表
      setIsTaskBeingEditedInModal(false); // 退出編輯模式
      // 如果是新創建的，用戶可能想繼續查看，所以不自動關閉彈窗
      // if (!editableTaskInModal.task_id) { handleCloseModal(); } 
    } catch (err) { console.error('❌ 保存任務失敗:', err); alert(`保存任務失敗: ${err.message}`); }
  };

  // 保存主專案詳情
  const handleSaveProjectDetails = useCallback(async () => {
    if (!isEditing || !project || !projectId) {
      alert('非編輯模式或專案未載入，無法保存。');
      return;
    }
    if (!currentUser) {
      alert('請先登入才能保存專案資料。');
      return;
    }

    // 準備要提交的資料
    // 注意：這裡需要包含所有後端期望更新的字段
    // 確保日期和時間格式與後端期望的一致 (YYYY-MM-DD, HH:mm:ss)
    const updatedProjectData = {
      groom_name: project.groom_name || null,
      bride_name: project.bride_name || null,
      couple_phone: project.couple_phone || null,
      couple_email: project.couple_email || null,
      wedding_date: project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : null,
      wedding_time: project.wedding_time || null, // 假設時間格式直接匹配
      wedding_place: project.wedding_place || null,
      budget_id: project.budget_id || null,
      plan_id: project.plan_id || null,
      wedding_style: project.wedding_style || null,
      venue_type: project.venue_type || null,
      total_budget: project.total_budget || null,
      project_status: project.project_status || '規劃中',
      google_sheet_link: project.google_sheet_link || null,
      couple_remark: note || null, // 將 note 的值賦給 couple_remark
      horoscope: project.horoscope || null,
      blood_type: project.blood_type || null,
      favorite_color: project.favorite_color || null,
      favorite_season: project.favorite_season || null,
      beliefs_description: project.beliefs_description || null,
      needs_description: project.needs_description || null,
      contact_person: project.contact_person,
      // project_build_time 和 project_update_time 應該由後端自動處理，前端不需要發送
    };

    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProjectData),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: '無法解析錯誤訊息' }));
        throw new Error(errorBody.message || `HTTP 錯誤 ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '後端回傳保存失敗');
      }

      alert('✅ 專案資料已成功保存！');
      setIsEditing(false); // 退出編輯模式
      await fetchProjectDetails(); // 重新載入最新資料
      // 重新觸發任務分類，以確保如果婚期變化，階段標題會更新
      await fetchProjectTasks(); // 確保任務數據是最新的，儘管婚期變化不直接影響任務，但流程上可以確保數據一致
    } catch (error) {
      console.error('❌ 保存專案資料失敗:', error);
      alert(`❌ 保存專案資料失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [isEditing, project, projectId, currentUser, fetchWithAuth, note, fetchProjectDetails, fetchProjectTasks]); // 將所有依賴項加入

  // --- 渲染邏輯 ---
  if (!currentUser && localStorage.getItem('token')) { return <p className="p-6 text-gray-500">正在加載用戶資訊...</p>; }
  if (!currentUser && !localStorage.getItem('token')) { /* App.jsx 應處理導向登入 */ return <p className="p-6 text-red-500">請先登入。</p>; }
  if (loading && !project) { return <p className="p-6 text-gray-500">📦 專案資料載入中...</p>; }
  if (apiError && !project) { return <p className="p-6 text-red-500">❌ {apiError}</p>; }
  if (projectNotFound || !project) { return <p className="p-6 text-red-500">❌ 專案不存在或尚無資料</p>; }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 頁面頂部按鈕 */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <button onClick={() => navigate('/projectall')} className="text-[#cb8a90] hover:underline font-medium">
          ← 回到專案列表
        </button>
        {currentUser && ( // 只有登入用戶才能看到編輯按鈕
            <div>
            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="bg-yellow-400 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-yellow-500 transition-colors">
                編輯專案資料
                </button>
            )}
            {isEditing && (
                <>
                <button onClick={handleSaveProjectDetails} className="bg-green-600 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-green-700 transition-colors">
                    保存專案資料
                </button>
                <button onClick={() => { setIsEditing(false); fetchProjectDetails(); }} className="ml-2 bg-gray-400 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-gray-500 transition-colors">
                    取消編輯
                </button>
                </>
            )}
            </div>
        )}
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">專案基本資料</h2>
      <table className="w-full text-sm detail-table">
        <tbody>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">專案ID</th>
            <td className="border px-4 py-2">{project.project_id}</td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">新郎</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.groom_name || ''} onChange={e => setProject({ ...project, groom_name: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.groom_name || <span className="italic text-gray-500">未提供</span>)}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">新娘</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.bride_name || ''} onChange={e => setProject({ ...project, bride_name: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.bride_name || <span className="italic text-gray-500">未提供</span>)}
            </td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">聯絡人</th>
            <td className="border px-4 py-2">
              {isEditing ? (
                <input 
                  value={project.contact_person || ''} 
                  onChange={e => setProject({ ...project, contact_person: e.target.value })} 
                  className="w-full border rounded px-2 py-1" 
                  placeholder="主要的聯絡窗口"
                />
              ) : (
                project.contact_person || <span className="italic text-gray-500">未指定</span>
              )}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">電話</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.couple_phone || ''} onChange={e => setProject({ ...project, couple_phone: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.couple_phone || <span className="italic text-gray-500">未提供</span>)}
            </td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">Email</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.couple_email || ''} onChange={e => setProject({ ...project, couple_email: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.couple_email || <span className="italic text-gray-500">未提供</span>)}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">婚期</th>
            <td className="border px-4 py-2">
              {isEditing ? (
                <input type="date" value={project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : ''} onChange={e => setProject({ ...project, wedding_date: e.target.value })} className="w-full border rounded px-2 py-1"/>
              ) : (project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : <span className="italic text-gray-500">未設定</span>)}
            </td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">婚禮時間</th>
            <td className="border px-4 py-2">
              {isEditing ? (
                <input type="time" value={project.wedding_time || ''} onChange={e => setProject({ ...project, wedding_time: e.target.value })} className="w-full border rounded px-2 py-1"/>
              ) : (project.wedding_time ? moment(project.wedding_time, 'HH:mm:ss').format('HH:mm') : <span className="italic text-gray-500">未設定</span>)}
            </td>
          </tr>
          <tr>
              <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600 align-top">地點</th>
              <td className="border px-4 py-2" colSpan={isEditing ? 1 : 3}> {/* 注意這裡的 colSpan */}
                  {isEditing ? (
                  <textarea /* ... 地點輸入 ... */ />
                  ) : (
                  project.wedding_place || <span className="italic text-gray-500">未提供</span>
                  )}
              </td>
              {/* 只有在編輯模式下才顯示預算ID輸入，以便為場地類型騰出空間 */}
              {isEditing && ( // 這段只在 isEditing true 時渲染
                  <>
                  <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600 align-top">預算ID</th>
                  <td className="border px-4 py-2 align-top">
                      <input type="number" /* ... 預算ID輸入 ... */ />
                  </td>
                  </>
              )}
          </tr>

          {/* ---------- 新增：場地類型 (室內/戶外) ---------- */}
          <tr>
              <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">場地類型</th>
              <td className="border px-4 py-2" colSpan="3"> {/* <<< 問題可能在這裡的 colSpan="3" */}
                  {isEditing ? (
                  <select
                      value={project.venue_type || ''}
                      onChange={e => setProject({ ...project, venue_type: e.target.value })}
                      className="w-full border rounded px-2 py-1.5"
                  >
                      <option value="">不指定</option>
                      <option value="室內">室內</option>
                      <option value="戶外">戶外</option>
                  </select>
                  ) : (
                  project.venue_type || <span className="italic text-gray-500">未指定</span>
                  )}
              </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">方案ID</th>
            <td className="border px-4 py-2">
              {isEditing ? <input type="number" value={project.plan_id || ''} onChange={e => setProject({ ...project, plan_id: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.plan_id || <span className="italic text-gray-500">未指定</span>)}
            </td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">婚禮風格</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.wedding_style || ''} onChange={e => setProject({ ...project, wedding_style: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.wedding_style || <span className="italic text-gray-500">未指定</span>)}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">總預算</th>
            <td className="border px-4 py-2">
              {isEditing ? <input type="number" step="0.01" value={project.total_budget || ''} onChange={e => setProject({ ...project, total_budget: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.total_budget ? `¥${parseFloat(project.total_budget).toLocaleString()}` : <span className="italic text-gray-500">未設定</span>)}
            </td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">專案狀態</th>
            <td className="border px-4 py-2">
              {isEditing ? (
                <select value={project.project_status || '規劃中'} onChange={e => setProject({...project, project_status: e.target.value})} className="w-full border rounded px-2 py-1.5">
                  <option value="規劃中">規劃中</option>
                  <option value="進行中">進行中</option>
                  <option value="已完成">已完成</option>
                  <option value="延期">延期</option>
                  <option value="取消">取消</option>
                </select>
              ) : (project.project_status || <span className="italic text-gray-500">未設定</span>)}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">Google Sheet</th>
            <td className="border px-4 py-2" colSpan="3">
              {isEditing ? (
                <input type="text" value={project.google_sheet_link || ''} onChange={e => setProject({ ...project, google_sheet_link: e.target.value })} className="w-full border rounded px-2 py-1" placeholder="https://docs.google.com/..."/>
              ) : (
                project.google_sheet_link ? <a href={project.google_sheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{project.google_sheet_link}</a> : <span className="italic text-gray-500">未設定</span>
              )}
            </td>
          </tr>
            <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">建立時間</th>
            <td className="border px-4 py-2">{project.project_build_time ? moment(project.project_build_time).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">最後更新</th>
            <td className="border px-4 py-2">{project.project_update_time ? moment(project.project_update_time).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</td>
          </tr>
          {/* --- 新人偏好等詳細資料 --- */}
          <tr><td colSpan="4" className="pt-3 pb-1"><h3 className="text-md font-semibold text-gray-600">新人偏好細節</h3></td></tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">星座</th>
            <td className="border px-4 py-2">{isEditing ? <input value={project.horoscope || ''} onChange={e => setProject({ ...project, horoscope: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.horoscope || <span className="italic text-gray-500">未提供</span>)}</td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">血型</th>
            <td className="border px-4 py-2">{isEditing ? <input value={project.blood_type || ''} onChange={e => setProject({ ...project, blood_type: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.blood_type || <span className="italic text-gray-500">未提供</span>)}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">喜歡的顏色</th>
            <td className="border px-4 py-2">{isEditing ? <input value={project.favorite_color || ''} onChange={e => setProject({ ...project, favorite_color: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.favorite_color || <span className="italic text-gray-500">未提供</span>)}</td>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600">喜歡的季節</th>
            <td className="border px-4 py-2">{isEditing ? <input value={project.favorite_season || ''} onChange={e => setProject({ ...project, favorite_season: e.target.value })} className="w-full border rounded px-2 py-1" /> : (project.favorite_season || <span className="italic text-gray-500">未提供</span>)}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600 align-top">信仰/禁忌</th>
            <td className="border px-4 py-2" colSpan="3">{isEditing ? <textarea value={project.beliefs_description || ''} onChange={e => setProject({ ...project, beliefs_description: e.target.value })} rows="2" className="w-full border rounded px-2 py-1" /> : (project.beliefs_description || <span className="italic text-gray-500">未提供</span>)}</td>
          </tr>
          <tr>
            <th className="border px-4 py-2 bg-slate-50 text-left text-slate-600 align-top">其他需求</th>
            <td className="border px-4 py-2" colSpan="3">{isEditing ? <textarea value={project.needs_description || ''} onChange={e => setProject({ ...project, needs_description: e.target.value })} rows="2" className="w-full border rounded px-2 py-1" /> : (project.needs_description || <span className="italic text-gray-500">未提供</span>)}</td>
          </tr>
        </tbody>
      </table>
    </div>


      {/* 顧客需求細節 */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <label htmlFor="couple_remark_textarea" className="block text-xl font-semibold text-gray-700 mb-3">顧客需求細節</label>
        <textarea id="couple_remark_textarea" rows="5" className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#cb8a90] focus:border-[#cb8a90] transition-shadow" value={note} onChange={(e) => setNote(e.target.value)} disabled={!isEditing} placeholder={isEditing ? "請輸入顧客需求..." : "無"}/>
      </div>

      {/* 專案排程 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#cb8a90] mb-6">專案排程</h2>
        {categorizedTasks.length > 0 ? (
            categorizedTasks.map((stage, sIdx) => (
              <div className="stage mb-8 bg-white shadow-md rounded-lg overflow-hidden" key={`${stage.title}-${sIdx}`}> {/* 增加 mb-8 給階段間更多空間 */}
                <h3 className="bg-gray-100 text-gray-700 p-4 font-semibold border-b">{stage.title}</h3>
                {/* 修改 ul 為 div，並添加 flex 佈局 */}
                <div className="p-4 flex flex-wrap gap-3"> {/* gap-3 在任務項之間創建間隙 */}
                  {stage.tasks.length > 0 ? (
                    stage.tasks.map((task) => (
                      // 為每個任務項設定寬度，並調整樣式使其更像卡片或按鈕
                      <div
                        key={task.key}
                        className={`
                          p-3 rounded-lg shadow 
                          border border-gray-200 
                          cursor-pointer 
                          hover:shadow-md hover:border-pink-300 transition-all
                          flex-grow  // 允許項目在有剩餘空間時增長
                          basis-full sm:basis-[calc(50%-0.75rem)] md:basis-[calc(33.333%-0.75rem)] lg:basis-[calc(25%-0.75rem)] xl:basis-[calc(20%-0.75rem)] // 響應式寬度
                          min-w-[150px] // 最小寬度，防止內容被過度壓縮
                          ${task.task_status === '已完成' ? 'bg-green-50 border-green-200' : 'bg-white'}
                        `}
                        onClick={() => openTaskDetailModal(task)}
                      >
                        <div className="flex flex-col justify-between h-full"> {/* 內部也用 flex 方便內容對齊 */}
                          <div>
                            <span className={`block text-sm font-semibold mb-1 truncate ${task.task_status === '已完成' ? 'text-green-700' : 'text-gray-800'}`}>
                              {task.name}
                            </span>
                            {task.task_status && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ task.task_status === '已完成' ? 'bg-green-200 text-green-900' : task.task_status === '進行中' ? 'bg-blue-200 text-blue-900' : task.task_status === '延遲' ? 'bg-red-200 text-red-900' : 'bg-gray-200 text-gray-800' }`}>
                                {task.task_status}
                                {task.task_status === '已完成' && <span className="ml-1">✔</span>}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                            {task.responsible_staff && (
                              <div className="truncate"> {/* truncate 防止負責人過長 */}
                                負責: {task.responsible_staff}
                              </div>
                            )}
                            {task.task_status === '已完成' && task.actual_end && (
                              <div className="text-green-600">
                                完成: {moment(task.actual_end).format('MM/DD')}
                              </div>
                            )}
                            {/* 可以根據需要顯示更多簡略信息，如預計結束日期 */}
                            {task.expected_end && task.task_status !== '已完成' && (
                              <div className="truncate">預計: {moment(task.expected_end).format('MM/DD')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-gray-500 italic w-full">此階段目前沒有任務。</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-5">目前沒有排程任務，或仍在載入中...</p>
          )}
      </div>


      {/* --- 任務詳情/編輯/完成 彈窗 --- */}
      {showTaskDetailModal && selectedTaskForModal && editableTaskInModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex items-center justify-center z-[100] overflow-y-auto px-4 py-6">
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl max-w-xl w-full max-h-[95vh] overflow-y-auto">
            {/* A. 完成任務表單 */}
            {showCompleteTaskForm ? (
                <>
                    <h3 className="text-2xl font-semibold mb-6 text-[#cb8a90] border-b pb-3">完成任務：{editableTaskInModal.name}</h3>
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="actual_end_date_complete" className="block text-sm font-medium text-gray-700 mb-1">實際完成日期 <span className="text-red-500">*</span></label>
                            <input type="date" id="actual_end_date_complete" value={completeTaskFormData.actual_end}
                                    onChange={e => setCompleteTaskFormData({...completeTaskFormData, actual_end: e.target.value})}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#cb8a90] focus:border-[#cb8a90] p-2.5"/>
                        </div>
                        <div>
                            <label htmlFor="completion_remark_form" className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                            <textarea id="completion_remark_form" rows="4" value={completeTaskFormData.remark}
                                        onChange={e => setCompleteTaskFormData({...completeTaskFormData, remark: e.target.value})}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#cb8a90] focus:border-[#cb8a90] p-2.5" placeholder="請輸入備註（選填）"/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                        <button onClick={handleConfirmCompleteTask} className="px-5 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium shadow-sm transition-colors"> 確認完成此任務 </button>
                        <button type="button" onClick={() => setShowCompleteTaskForm(false)} className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"> 取消 </button>
                    </div>
                </>
            ) : (
                 <> {/* B. 任務詳情顯示/編輯 */}
                    <div className="flex justify-between items-start mb-5 pb-3 border-b">
                        <h3 className="text-2xl font-semibold text-[#cb8a90] flex-grow break-words">
                        {isTaskBeingEditedInModal ? '編輯任務：' : '任務詳情：'}
                        {isTaskBeingEditedInModal ? (
                            <input type="text" name="name" value={editableTaskInModal.name} onChange={handleTaskDetailInputChange} className="font-semibold text-2xl border-b-2 border-pink-200 focus:border-pink-400 outline-none w-full mt-1" />
                        ) : ( editableTaskInModal.name )}
                        </h3>
                        {/* "編輯此任務" 按鈕 */}
                        {currentUser && !isTaskBeingEditedInModal && !showCompleteTaskForm && (
                        <button
                            onClick={() => setIsTaskBeingEditedInModal(true) }
                            className="ml-4 text-sm bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-4 rounded-md shadow-sm whitespace-nowrap transition-colors">
                            {editableTaskInModal.task_id ? '編輯此任務' : '編輯並創建'}
                        </button>
                        )}
                    </div>

                    <div className="space-y-4 text-sm">
                        <div><strong className="text-gray-600">任務內容:</strong> {isTaskBeingEditedInModal ? <textarea name="task_content" value={editableTaskInModal.task_content || ''} onChange={handleTaskDetailInputChange} rows="3" className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2"/> : (editableTaskInModal.task_content || <span className="text-gray-500 italic">無</span>)}</div>
                        <div><strong className="text-gray-600">負責人:</strong>
                            {isTaskBeingEditedInModal ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="text" name="responsible_staff" value={editableTaskInModal.responsible_staff || ''} onChange={handleTaskDetailInputChange} className="w-full border-gray-300 rounded-md shadow-sm p-2"/>
                                    {currentUser?.name && <button onClick={() => setEditableTaskInModal(prev => ({...prev, responsible_staff: currentUser.name}))} className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-3 rounded-md whitespace-nowrap transition-colors">指派給我</button>}
                                </div>
                            ) : (editableTaskInModal.responsible_staff || <span className="text-gray-500 italic">無</span>)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><strong className="text-gray-600">預計開始:</strong> {isTaskBeingEditedInModal ? <input type="date" name="expected_start" value={editableTaskInModal.expected_start ? moment(editableTaskInModal.expected_start).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2"/> : (editableTaskInModal.expected_start ? moment(editableTaskInModal.expected_start).format('YYYY-MM-DD') : <span className="text-gray-500 italic">無</span>)}</div>
                            <div><strong className="text-gray-600">預計結束:</strong> {isTaskBeingEditedInModal ? <input type="date" name="expected_end" value={editableTaskInModal.expected_end ? moment(editableTaskInModal.expected_end).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2"/> : (editableTaskInModal.expected_end ? moment(editableTaskInModal.expected_end).format('YYYY-MM-DD') : <span className="text-gray-500 italic">無</span>)}</div>
                            <div><strong className="text-gray-600">實際開始:</strong> {isTaskBeingEditedInModal ? <input type="date" name="actual_start" value={editableTaskInModal.actual_start ? moment(editableTaskInModal.actual_start).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2"/> : (editableTaskInModal.actual_start ? moment(editableTaskInModal.actual_start).format('YYYY-MM-DD') : <span className="text-gray-500 italic">無</span>)}</div>
                            <div><strong className="text-gray-600">實際結束:</strong> {isTaskBeingEditedInModal && editableTaskInModal.task_status === '已完成' ? <input type="date" name="actual_end" value={editableTaskInModal.actual_end ? moment(editableTaskInModal.actual_end).format('YYYY-MM-DD') : ''} onChange={handleTaskDetailInputChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2"/> : (editableTaskInModal.actual_end ? moment(editableTaskInModal.actual_end).format('YYYY-MM-DD') : <span className="text-gray-500 italic">無</span>)}</div>
                        </div>
                        <div><strong className="text-gray-600">任務狀態:</strong>
                        {isTaskBeingEditedInModal && editableTaskInModal.task_status !== '已完成' ? (
                            <select name="task_status" value={editableTaskInModal.task_status} onChange={handleTaskDetailInputChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2.5 focus:ring-[#cb8a90] focus:border-[#cb8a90]">
                            <option value="尚未開始">尚未開始</option> <option value="進行中">進行中</option> <option value="延遲">延遲</option>
                            </select>
                        ) : (<span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${ editableTaskInModal.task_status === '已完成' ? 'bg-green-100 text-green-700' : editableTaskInModal.task_status === '進行中' ? 'bg-blue-100 text-blue-700' : editableTaskInModal.task_status === '延遲' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700' }`}>{editableTaskInModal.task_status || '未定義'}</span>)}
                        </div>
                        <div><strong className="text-gray-600">優先級:</strong>
                        {isTaskBeingEditedInModal ? (
                            <select name="priority" value={editableTaskInModal.priority} onChange={handleTaskDetailInputChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2.5 focus:ring-[#cb8a90] focus:border-[#cb8a90]">
                            <option value="高">高</option> <option value="中">中</option> <option value="低">低</option>
                            </select>
                        ) : (editableTaskInModal.priority || <span className="text-gray-500 italic">無</span>)}
                        </div>
                        <div><strong className="text-gray-600">備註:</strong> {isTaskBeingEditedInModal ? <textarea name="remark" value={editableTaskInModal.remark || ''} onChange={handleTaskDetailInputChange} rows="3" className="mt-1 w-full border-gray-300 rounded-md shadow-sm p-2"/> : (editableTaskInModal.remark || <span className="text-gray-500 italic">無</span>)}</div>
                        <p className="text-xs text-gray-400 pt-3 border-t mt-4">任務ID: {editableTaskInModal.task_id || 'N/A (新任務)'}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-5 border-t">
                        {isTaskBeingEditedInModal ? (
                        <>
                            <button onClick={handleSaveTaskDetails} className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium shadow-sm transition-colors"> 保存任務 </button>
                            <button type="button" onClick={() => { setIsTaskBeingEditedInModal(false); setEditableTaskInModal({...selectedTaskForModal});}} className="w-full sm:w-auto px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"> 取消編輯 </button>
                        </>
                        ) : ( /* 標記完成/未完成按鈕 (只有在主編輯模式下才顯示) */
                            isEditing && currentUser && !showCompleteTaskForm && (
                            <>
                                {editableTaskInModal.task_status === '已完成' && editableTaskInModal.task_id ? (
                                <button onClick={handleMarkAsNotStarted} className="w-full sm:w-auto px-5 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-700 font-medium shadow-sm transition-colors"> 標記為尚未開始 </button>
                                ) : (
                                editableTaskInModal.task_status !== '已完成' && (
                                    <button onClick={prepareCompleteTaskForm} className="w-full sm:w-auto px-5 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium shadow-sm transition-colors"> 標記為已完成 </button>
                                )
                                )}
                            </>
                            )
                        )}
                        {/* 關閉按鈕（僅當不在完成表單且不在任務編輯模式時，或者在任務編輯模式但作為一個額外的關閉選項） */}
                        {(!showCompleteTaskForm) && (
                            <button type="button" onClick={handleCloseModal} className="w-full sm:w-auto px-5 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium shadow-sm transition-colors"> 關閉 </button>
                        )}
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