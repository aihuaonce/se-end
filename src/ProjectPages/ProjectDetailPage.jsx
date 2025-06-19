import React, { useEffect, useState } from 'react';
import '../styles/ProjectStages.css'; // 請確保此 CSS 檔案存在且包含相關樣式
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment'; // 引入 moment 處理日期格式顯示

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保與後端伺服器端口一致

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [categorizedTasks, setCategorizedTasks] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [showCompleteTaskForm, setShowCompleteTaskForm] = useState(false);
  const [completeTaskData, setCompleteTaskData] = useState({ actual_end: '', remark: '' });


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
      setLoading(true);
      await fetchProjectDetails();
      await fetchProjectTasks();
      setLoading(false);
    };
    loadProjectData();
  }, [id]);

  useEffect(() => {
    categorizeAndSetTasks(projectTasks);
  }, [projectTasks]);


  const fetchProjectDetails = async () => {
    setNotFound(false);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        if (res.status === 404) {
            setNotFound(true);
            console.warn(`專案ID ${id} 不存在 (fetchProjectDetails)`);
            return;
        }
        throw new Error(errorBody.message || `HTTP 錯誤：${res.status} ${res.statusText}`);
      }
      const jsonResponse = await res.json();
      if (!jsonResponse.success || !jsonResponse.data || Object.keys(jsonResponse.data).length === 0) {
        setNotFound(true);
        console.warn(`專案ID ${id} 找不到數據或數據為空 (fetchProjectDetails)`);
      } else {
        setProject(jsonResponse.data);
        setNote(jsonResponse.data.couple_remark || '');
      }
    } catch (err) {
      console.error('❌ 專案資料載入失敗 (fetchProjectDetails):', err);
      setError(`無法載入專案資料：${err.message}`);
      setNotFound(true);
    }
  };

  const fetchProjectTasks = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/tasks`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: '未知錯誤' }));
        throw new Error(errorBody.message || `HTTP 錯誤：${res.status} ${res.statusText}`);
      }
      const jsonResponse = await res.json();
      if (!jsonResponse.success || !Array.isArray(jsonResponse.data)) {
        console.warn('獲取任務資料失敗或資料格式不正確 (fetchProjectTasks):', jsonResponse);
        setProjectTasks([]);
      } else {
        setProjectTasks(jsonResponse.data);
      }
    } catch (err) {
      console.error('❌ 任務資料載入失敗 (fetchProjectTasks):', err);
      setError(`無法載入任務資料：${err.message}`);
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
          task_content: dbTask ? dbTask.task_content : null,
          responsible_staff: dbTask ? dbTask.responsible_staff : null,
          expected_start: dbTask ? dbTask.expected_start : null,
          expected_end: dbTask ? dbTask.expected_end : null,
          actual_start: dbTask ? dbTask.actual_start : null,
          actual_end: dbTask ? dbTask.actual_end : null,
          task_status: dbTask ? dbTask.task_status : '未定義',
          priority: dbTask ? dbTask.priority : '中',
          remark: dbTask ? dbTask.remark : null,
          key: dbTask ? `db-${dbTask.task_id}` : `default-${taskName}-${Math.random()}`
        };
      })
    }));

    const otherTasks = tasksFromDB.filter(dbTask =>
      !initialStages.some(stage =>
        stage.tasks.includes(dbTask.task_name)
      )
    ).map(dbTask => ({
      name: dbTask.task_name,
      ...dbTask,
      key: `db-${dbTask.task_id}`
    }));

    if (otherTasks.length > 0) {
        updatedStages.push({
            title: '其他任務 (未分類)',
            tasks: otherTasks
        });
    }
    setCategorizedTasks(updatedStages);
  };

  const openTaskDetailModal = (task) => {
    setSelectedTask(task);
    setShowCompleteTaskForm(false);
    setCompleteTaskData({ actual_end: '', remark: '' });
    setShowTaskDetailModal(true);

    // --- DEBUGGING LOGS ---
    console.log("--- Opening task detail modal for:", task ? task.name : 'N/A ---');
    console.log("isEditing:", isEditing);
    console.log("selectedTask.task_id:", task ? task.task_id : 'N/A');
    console.log("selectedTask.task_status:", task ? task.task_status : 'N/A');
    console.log("showCompleteTaskForm (should be false here):", false);
    // --- END DEBUGGING LOGS ---
  };

  const handleCloseModal = () => {
    setShowTaskDetailModal(false);
    setShowCompleteTaskForm(false);
  };

  const updateTaskInDB = async (taskId, updates) => {
    if (!isEditing) {
      alert('請先點擊「編輯專案資料」按鈕才能更新任務。');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: '任務更新失敗' }));
        throw new Error(errorBody.message || `任務更新失敗: ${res.status} ${res.statusText}`);
      }

      alert('✅ 任務已更新！');
      fetchProjectTasks();
      handleCloseModal();

    } catch (err)      {
      console.error('❌ 更新任務失敗:', err);
      alert(`更新任務失敗: ${err.message}`);
    }
  };

  const prepareCompleteTaskForm = () => {
    if (!selectedTask) return;
    setCompleteTaskData({
      actual_end: moment().format('YYYY-MM-DD'),
      remark: selectedTask.remark || ''
    });
    setShowCompleteTaskForm(true);
  };

  const handleConfirmCompleteTask = async () => {
    if (!selectedTask || !selectedTask.task_id) return;
    if (!completeTaskData.actual_end) {
      alert("請輸入實際完成日期。");
      return;
    }
    const updates = {
      task_status: '已完成',
      actual_end: moment(completeTaskData.actual_end).format('YYYY-MM-DD'),
      remark: completeTaskData.remark
    };
    await updateTaskInDB(selectedTask.task_id, updates);
  };

  const handleMarkAsNotStarted = async () => {
    if (!selectedTask || !selectedTask.task_id) return;
    if (window.confirm(`您確定要將任務 "${selectedTask.name}" 標記為「尚未開始」嗎？相關的實際完成日期將被清除。`)) {
      const updates = {
        task_status: '尚未開始',
        actual_end: null
      };
      await updateTaskInDB(selectedTask.task_id, updates);
    }
  };

  const handleSave = async () => {
    if (!isEditing) {
        alert('請先點擊編輯按鈕');
        return;
    };
    let formattedWeddingDate = project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : null;
    let formattedWeddingTime = project.wedding_time ? moment(project.wedding_time, 'HH:mm:ss').format('HH:mm:ss') : null;
    const updatedProjectData = {
        groom_name: project.groom_name, bride_name: project.bride_name,
        phone: project.couple_phone, email: project.couple_email,
        wedding_date: formattedWeddingDate, wedding_time: formattedWeddingTime,
        wedding_place: project.wedding_place, remark: note,
        plan_id: project.plan_id, budget_id: project.budget_id,
        wedding_style: project.wedding_style, horoscope: project.horoscope,
        blood_type: project.blood_type, favorite_color: project.favorite_color,
        favorite_season: project.favorite_season, beliefs_description: project.beliefs_description,
        needs_description: project.needs_description, total_budget: project.total_budget,
        project_status: project.project_status, google_sheet_link: project.google_sheet_link,
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
      console.error('❌ 更新專案資料失敗 (handleSave):', error);
      alert(`❌ 更新失敗: ${error.message}`);
    } finally {
      setIsEditing(false);
      fetchProjectDetails();
    }
  };

  if (loading) return <p className="p-6 text-gray-500">📦 專案資料載入中...</p>;
  if (error) return <p className="p-6 text-red-500">❌ {error}</p>;
  if (notFound || !project) return <p className="p-6 text-red-500">❌ 專案不存在或尚無資料</p>;

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
              <button onClick={handleSave} className="bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700">
                保存專案資料
              </button>
          )}
          {isEditing && (
              <button onClick={() => { setIsEditing(false); fetchProjectDetails(); fetchProjectTasks(); }} className="bg-gray-400 text-white font-semibold px-4 py-2 rounded ml-2 hover:bg-gray-500">
                取消編輯
              </button>
          )}
        </div>
      </div>

      <table className="table-auto border w-full mb-6 text-sm">
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
              {`${project.groom_name || ''} & ${project.bride_name || ''}`}
            </td>
            <th className="border px-4 py-2">電話</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.couple_phone || ''} onChange={e => setProject({ ...project, couple_phone: e.target.value })} className="w-full border px-1" /> : project.couple_phone}
            </td>
            <th className="border px-4 py-2">Email</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.couple_email || ''} onChange={e => setProject({ ...project, couple_email: e.target.value })} className="w-full border px-1" /> : project.couple_email}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">婚期</th>
            <td className="border px-4 py-2">
              {isEditing ? (
                <input
                  type="date"
                  value={project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : ''}
                  onChange={e => setProject({ ...project, wedding_date: e.target.value })}
                  className="w-full border px-1"
                />
              ) : (project.wedding_date ? moment(project.wedding_date).format('YYYY-MM-DD') : '未設定')}
            </td>
            <th className="border px-4 py-2">地點</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.wedding_place || ''} onChange={e => setProject({ ...project, wedding_place: e.target.value })} className="w-full border px-1" /> : project.wedding_place}
            </td>
            <th className="border px-4 py-2">預算ID</th>
            <td className="border px-4 py-2">
              {isEditing ? <input type="number" value={project.budget_id || ''} onChange={e => setProject({ ...project, budget_id: e.target.value })} className="w-full border px-1" /> : project.budget_id}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">方案ID</th>
            <td className="border px-4 py-2">
              {isEditing ? <input type="number" value={project.plan_id || ''} onChange={e => setProject({ ...project, plan_id: e.target.value })} className="w-full border px-1" /> : project.plan_id}
            </td>
            <th className="border px-4 py-2">風格</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.wedding_style || ''} onChange={e => setProject({ ...project, wedding_style: e.target.value })} className="w-full border px-1" /> : project.wedding_style}
            </td>
            <th className="border px-4 py-2">建立時間</th>
            <td className="border px-4 py-2">
              {project.project_build_time ? moment(project.project_build_time).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">更新時間</th>
            <td className="border px-4 py-2">
              {project.project_update_time ? moment(project.project_update_time).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
            </td>
            <th className="border px-4 py-2">Google Sheet Link</th>
            <td className="border px-4 py-2" colSpan="3">
              {isEditing ? (
                <input
                  type="text"
                  value={project.google_sheet_link || ''}
                  onChange={e => setProject({ ...project, google_sheet_link: e.target.value })}
                  className="w-full border px-1"
                  placeholder="https://docs.google.com/..."
                />
              ) : (
                project.google_sheet_link ? (
                  <a href={project.google_sheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {project.google_sheet_link}
                  </a>
                ) : '未設定'
              )}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">星座</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.horoscope || ''} onChange={e => setProject({ ...project, horoscope: e.target.value })} className="w-full border px-1" /> : project.horoscope}
            </td>
            <th className="border px-4 py-2">血型</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.blood_type || ''} onChange={e => setProject({ ...project, blood_type: e.target.value })} className="w-full border px-1" /> : project.blood_type}
            </td>
            <th className="border px-4 py-2">喜歡的顏色</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.favorite_color || ''} onChange={e => setProject({ ...project, favorite_color: e.target.value })} className="w-full border px-1" /> : project.favorite_color}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">喜歡的季節</th>
            <td className="border px-4 py-2">
              {isEditing ? <input value={project.favorite_season || ''} onChange={e => setProject({ ...project, favorite_season: e.target.value })} className="w-full border px-1" /> : project.favorite_season}
            </td>
            <th className="border px-4 py-2">信仰/禁忌</th>
            <td className="border px-4 py-2" colSpan="3">
              {isEditing ? <input value={project.beliefs_description || ''} onChange={e => setProject({ ...project, beliefs_description: e.target.value })} className="w-full border px-1" /> : project.beliefs_description}
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2">其他需求</th>
            <td className="border px-4 py-2" colSpan="5">
              {isEditing ? <textarea value={project.needs_description || ''} onChange={e => setProject({ ...project, needs_description: e.target.value })} rows="2" className="w-full border px-1" /> : project.needs_description}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-700 mb-2">顧客需求細節：</label>
        <textarea rows="4" className="w-full border rounded p-2" value={note} onChange={(e) => setNote(e.target.value)} disabled={!isEditing} />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#cb8a90]">專案排程</h2>
      </div>

      {categorizedTasks.length > 0 ? (
        categorizedTasks.map((stage, sIdx) => (
          <div className="stage mb-6 border border-gray-200 rounded-lg shadow-sm" key={sIdx}>
            <h3 className="bg-gray-100 text-gray-700 p-3 font-semibold rounded-t-lg">{stage.title}</h3>
            <ul className="divide-y divide-gray-100">
              {stage.tasks.length > 0 ? (
                stage.tasks.map((task) => (
                  <li key={task.key}
                      className={`flex items-center p-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${task.task_status === '已完成' ? 'bg-green-50 line-through text-gray-600' : ''}`}
                      onClick={() => openTaskDetailModal(task)}>
                    <div className="flex-grow">
                      <span className={`text-lg font-medium ${task.task_status === '已完成' ? 'text-gray-600' : 'text-gray-900'}`}>
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
                      {task.task_status === '已完成' && task.actual_end && (
                        <div className="text-sm text-green-700">完成於: {moment(task.actual_end).format('YYYY-MM-DD')}</div>
                      )}
                    </div>
                  </li>
                ))
              ) : ( <li className="p-3 text-gray-500 italic">此階段目前沒有任務。</li> )}
            </ul>
          </div>
        ))
      ) : ( <p className="text-gray-500 mb-6">目前沒有排程任務。</p> )}

      {showTaskDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-xl w-full">
            {!showCompleteTaskForm ? (
              <>
                <h3 className="text-xl font-bold mb-4 text-[#cb8a90]">任務詳情：{selectedTask.name}</h3>
                <div className="mb-4 text-sm text-gray-700">
                  <p className="mb-2"><strong>任務內容:</strong> {selectedTask.task_content || '無'}</p>
                  <p className="mb-2"><strong>負責人:</strong> {selectedTask.responsible_staff || '無'}</p>
                  <p className="mb-2"><strong>預計開始:</strong> {selectedTask.expected_start ? moment(selectedTask.expected_start).format('YYYY-MM-DD') : '無'}</p>
                  <p className="mb-2"><strong>預計結束:</strong> {selectedTask.expected_end ? moment(selectedTask.expected_end).format('YYYY-MM-DD') : '無'}</p>
                  <p className="mb-2"><strong>實際開始:</strong> {selectedTask.actual_start ? moment(selectedTask.actual_start).format('YYYY-MM-DD') : '無'}</p>
                  <p className="mb-2"><strong>實際結束:</strong> {selectedTask.actual_end ? moment(selectedTask.actual_end).format('YYYY-MM-DD') : '無'}</p>
                  <p className="mb-2"><strong>任務狀態:</strong>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedTask.task_status === '已完成' ? 'bg-green-200 text-green-900' :
                        selectedTask.task_status === '進行中' ? 'bg-blue-200 text-blue-900' :
                        selectedTask.task_status === '延遲' ? 'bg-red-200 text-red-900' :
                        'bg-gray-200 text-gray-900'
                    }`}>{selectedTask.task_status || '未定義'}</span>
                  </p>
                  <p className="mb-2"><strong>優先級:</strong> {selectedTask.priority || '無'}</p>
                  <p className="mb-2"><strong>備註:</strong> {selectedTask.remark || '無'}</p>
                  <p className="text-xs text-gray-500 mt-4">任務ID: {selectedTask.task_id || 'N/A (此任務尚未儲存至資料庫)'}</p>
                </div>
                <div className="flex justify-end gap-2">
                  {/* --- DEBUGGING LOGS FOR BUTTON VISIBILITY --- */}
                  {console.log("--- Modal button rendering check ---")}
                  {console.log("  isEditing:", isEditing)}
                  {console.log("  selectedTask.task_id:", selectedTask ? selectedTask.task_id : 'N/A')}
                  {console.log("  selectedTask.task_status:", selectedTask ? selectedTask.task_status : 'N/A')}
                  {console.log("  Condition (selectedTask.task_id && isEditing):", !!(selectedTask && selectedTask.task_id && isEditing))}
                  {/* --- END DEBUGGING LOGS --- */}

                  {selectedTask.task_id && isEditing && (
                    <>
                      {selectedTask.task_status === '已完成' ? (
                        <button
                          onClick={handleMarkAsNotStarted}
                          className="py-2 px-4 rounded font-bold focus:outline-none focus:shadow-outline bg-red-500 text-white hover:bg-red-700"
                        >
                          標記為尚未開始
                        </button>
                      ) : (
                        <button
                          onClick={prepareCompleteTaskForm}
                          className="py-2 px-4 rounded font-bold focus:outline-none focus:shadow-outline bg-green-600 text-white hover:bg-green-700"
                        >
                          標記為已完成
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 focus:outline-none focus:shadow-outline"
                  >
                    關閉
                  </button>
                </div>
              </>
            ) : (
              <> {/* Task Completion Form */}
                <h3 className="text-xl font-bold mb-4 text-[#cb8a90]">完成任務：{selectedTask.name}</h3>
                <div className="mb-3">
                  <label htmlFor="actual_end_date" className="block text-sm font-medium text-gray-700 mb-1">實際完成日期：</label>
                  <input
                    type="date"
                    id="actual_end_date"
                    value={completeTaskData.actual_end}
                    onChange={e => setCompleteTaskData({...completeTaskData, actual_end: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="completion_remark" className="block text-sm font-medium text-gray-700 mb-1">備註（選填）：</label>
                  <textarea
                    id="completion_remark"
                    rows="3"
                    value={completeTaskData.remark}
                    onChange={e => setCompleteTaskData({...completeTaskData, remark: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleConfirmCompleteTask}
                    className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:shadow-outline"
                  >
                    確認完成此任務
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompleteTaskForm(false)}
                    className="bg-gray-400 text-white font-bold py-2 px-4 rounded hover:bg-gray-500 focus:outline-none focus:shadow-outline"
                  >
                    取消
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