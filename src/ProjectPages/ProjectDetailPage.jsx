import React, { useEffect, useState } from 'react';
import '../styles/ProjectStages.css';
import { useParams } from 'react-router-dom';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [taskStages, setTaskStages] = useState([]);

  useEffect(() => {
    fetchProjectDetails();
    initializeStages();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const res = await fetch(`/api/project-details/${id}`);
      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error('❌ 專案資料載入失敗:', err);
    }
  };

  const initializeStages = () => {
    const stages = [
      {
        title: '婚禮前 9-18 個月',
        tasks: [
          '選定婚期',
          '確定婚宴場地',
          '找婚顧',
          '初估人數',
          '確定婚禮形式'
        ]
      },
      {
        title: '婚禮前 3-9 個月',
        tasks: [
          '找新娘秘書',
          '找婚禮攝影',
          '找婚顧拍婚紗',
          '討論佈置風格'
        ]
      },
      {
        title: '婚禮前 3 個月',
        tasks: [
          '訂喜餅',
          '挑婚戒',
          '挑婚紗禮服',
          '主持人',
          '婚禮MV',
          '設計喜帖',
          '婚禮小物',
          '規劃婚禮流程',
          '協助人員名單',
          '決定人員',
          '統計賓客',
          '規劃蜜月'
        ]
      },
      {
        title: '婚禮前 2 個月',
        tasks: [
          '西服',
          '親友服裝',
          '寄喜帖',
          '溝通婚禮儀式',
          '採買婚禮用品',
          '租禮車'
        ]
      },
      {
        title: '婚禮前 1 個月',
        tasks: [
          '新娘試妝',
          '婚禮佈置',
          '試菜',
          '主持溝通',
          '賓客名單&座位表',
          '贈禮道具',
          '當日路線'
        ]
      },
      {
        title: '婚禮前 1-2 週',
        tasks: [
          '結婚誓詞',
          '彩排驗收',
          '確認桌數',
          '確認廠商',
          '確認用品',
          '紅包表',
          '禮車表',
          '人員通知',
          '婚前保養',
          '家長會議'
        ]
      }
    ];

    const stageState = stages.map(stage => ({
      title: stage.title,
      tasks: stage.tasks.map(name => ({ name, done: false }))
    }));
    setTaskStages(stageState);
  };

  const toggleTask = (stageIdx, taskIdx) => {
    const updatedStages = [...taskStages];
    updatedStages[stageIdx].tasks[taskIdx].done = !updatedStages[stageIdx].tasks[taskIdx].done;
    setTaskStages(updatedStages);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#cb8a90] mb-4">
        專案詳情：{project?.client_name || '載入中...'}
      </h1>

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
                {task.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ProjectDetailPage;