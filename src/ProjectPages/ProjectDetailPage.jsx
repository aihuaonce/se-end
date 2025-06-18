import React, { useEffect, useState } from 'react';
import '../styles/ProjectStages.css';
import { useParams, useNavigate } from 'react-router-dom';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [taskStages, setTaskStages] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    initializeStages();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const res = await fetch(`/api/projectdetail/${id}`);
      if (!res.ok) throw new Error('無法取得資料');
      const data = await res.json();

      if (!data || Object.keys(data).length === 0) {
        setNotFound(true);
      } else {
        setProject(data);
      }
    } catch (err) {
      console.error('❌ 專案資料載入失敗:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const initializeStages = () => {
    const stages = [
      { title: '婚禮前 9-18 個月', tasks: ['選定婚期','確定婚宴場地','找婚顧','初估人數','確定婚禮形式'] },
      { title: '婚禮前 3-9 個月', tasks: ['找新娘秘書','找婚禮攝影','找婚顧拍婚紗','討論佈置風格'] },
      { title: '婚禮前 3 個月', tasks: ['訂喜餅','挑婚戒','挑婚紗禮服','主持人','婚禮MV','設計喜帖','婚禮小物','規劃婚禮流程','協助人員名單','決定人員','統計賓客','規劃蜜月'] },
      { title: '婚禮前 2 個月', tasks: ['西服','親友服裝','寄喜帖','溝通婚禮儀式','採買婚禮用品','租禮車'] },
      { title: '婚禮前 1 個月', tasks: ['新娘試妝','婚禮佈置','試菜','主持溝通','賓客名單&座位表','贈禮道具','當日路線'] },
      { title: '婚禮前 1-2 週', tasks: ['結婚誓詞','彩排驗收','確認桌數','確認廠商','確認用品','紅包表','禮車表','人員通知','婚前保養','家長會議'] },
    ];

    const stageState = stages.map(stage => ({
      title: stage.title,
      tasks: stage.tasks.map(name => ({ name, done: false }))
    }));
    setTaskStages(stageState);
  };

  const toggleTask = (stageIdx, taskIdx) => {
    if (!isEditing) return;
    const updatedStages = [...taskStages];
    updatedStages[stageIdx].tasks[taskIdx].done = !updatedStages[stageIdx].tasks[taskIdx].done;
    setTaskStages(updatedStages);
  };

  const handleSave = async () => {
    try {
      const updatedProject = { ...project };
      const response = await fetch(`/api/project-details/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      if (!response.ok) throw new Error('更新失敗');
      alert('✅ 專案資料已更新');
    } catch (error) {
      console.error('❌ 更新失敗:', error);
    }
    setIsEditing(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate('/project-all')}
          className="text-[#cb8a90] hover:underline"
        >
          ← 回到上一頁
        </button>
        <div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-yellow-400 text-white font-semibold px-4 py-2 rounded mr-2 hover:bg-yellow-500"
          >
            編輯
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700"
          >
            保存
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">📦 專案載入中...</p>
      ) : notFound ? (
        <p className="text-red-500">❌ 專案不存在或尚無資料</p>
      ) : (
        <>
          <table className="table-auto border w-full mb-6">
            <tbody>
              <tr>
                <th className="border px-4 py-2">專案ID</th>
                <td className="border px-4 py-2">{project.project_id}</td>
                <th className="border px-4 py-2">新郎</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.groom_name} onChange={e => setProject({ ...project, groom_name: e.target.value })} className="w-full border px-1" /> : project.groom_name}
                </td>
                <th className="border px-4 py-2">新娘</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.bride_name} onChange={e => setProject({ ...project, bride_name: e.target.value })} className="w-full border px-1" /> : project.bride_name}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">聯絡人</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.client_name} onChange={e => setProject({ ...project, client_name: e.target.value })} className="w-full border px-1" /> : project.client_name}
                </td>
                <th className="border px-4 py-2">電話</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.phone_num} onChange={e => setProject({ ...project, phone_num: e.target.value })} className="w-full border px-1" /> : project.phone_num}
                </td>
                <th className="border px-4 py-2">婚期</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.wedding_date} onChange={e => setProject({ ...project, wedding_date: e.target.value })} className="w-full border px-1" /> : project.wedding_date}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">地點</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.wedding_place} onChange={e => setProject({ ...project, wedding_place: e.target.value })} className="w-full border px-1" /> : project.wedding_place}
                </td>
                <th className="border px-4 py-2">預算ID</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.budget_id} onChange={e => setProject({ ...project, budget_id: e.target.value })} className="w-full border px-1" /> : project.budget_id}
                </td>
                <th className="border px-4 py-2">方案ID</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.plan_id} onChange={e => setProject({ ...project, plan_id: e.target.value })} className="w-full border px-1" /> : project.plan_id}
                </td>
              </tr>
              <tr>
                <th className="border px-4 py-2">風格</th>
                <td className="border px-4 py-2">
                  {isEditing ? <input value={project.wedding_style} onChange={e => setProject({ ...project, wedding_style: e.target.value })} className="w-full border px-1" /> : project.wedding_style}
                </td>
                <th className="border px-4 py-2">建立時間</th>
                <td className="border px-4 py-2">{project.project_build_time}</td>
                <th className="border px-4 py-2">更新時間</th>
                <td className="border px-4 py-2">{project.project_update_time}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">顧客需求細節：</label>
            <textarea
              rows="4"
              className="w-full border rounded p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {taskStages.map((stage, sIdx) => (
            <div className="stage" key={sIdx}>
              <h2>{stage.title}</h2>
              <ul>
                {stage.tasks.map((task, tIdx) => (
                  <li
                    key={tIdx}
                    className={task.done ? 'done' : 'not-done'}
                    onClick={() => toggleTask(sIdx, tIdx)}
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