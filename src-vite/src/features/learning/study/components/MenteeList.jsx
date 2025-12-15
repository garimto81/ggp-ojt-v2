// OJT Master v2.3.0 - Mentee List Component
// @agent learning-study-agent

import { useState, useMemo } from 'react';
import { useDocs } from '@/contexts/DocsContext';
import { useAuth } from '@/contexts/AuthContext';
import { VIEW_STATES } from '@/constants';

export default function MenteeList() {
  const { allDocs, availableTeams, setSelectedDoc, isLoading } = useDocs();
  const { setViewState } = useAuth();

  const [selectedTeam, setSelectedTeam] = useState(null);

  // Filter docs by selected team
  const teamDocs = useMemo(() => {
    if (!selectedTeam) return allDocs;
    return allDocs.filter((d) => d.team === selectedTeam);
  }, [allDocs, selectedTeam]);

  // Group docs by step
  const docsByStep = useMemo(() => {
    return teamDocs.reduce((acc, doc) => {
      const step = doc.step || 1;
      if (!acc[step]) acc[step] = [];
      acc[step].push(doc);
      return acc;
    }, {});
  }, [teamDocs]);

  const handleDocSelect = (doc) => {
    setSelectedDoc(doc);
    setViewState(VIEW_STATES.MENTEE_STUDY);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Filter */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800">팀 선택</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTeam(null)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              selectedTeam === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {availableTeams.map((team) => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                selectedTeam === team
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      {/* Learning Roadmap */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800">
          학습 로드맵
          {selectedTeam && <span className="ml-2 text-blue-500">- {selectedTeam}</span>}
        </h2>

        {Object.keys(docsByStep).length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {selectedTeam
              ? `${selectedTeam} 팀의 학습 자료가 없습니다.`
              : '아직 학습 자료가 없습니다.'}
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(docsByStep)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([step, docs]) => (
                <div key={step}>
                  <h3 className="mb-3 text-sm font-medium text-gray-500">Step {step}</h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleDocSelect(doc)}
                        className="group rounded-xl border-2 border-gray-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 transition group-hover:bg-blue-200">
                            <span className="font-bold text-blue-600">{step}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-medium text-gray-800 group-hover:text-blue-600">
                              {doc.title}
                            </h4>
                            <p className="mt-1 text-xs text-gray-500">
                              {doc.sections?.length || 0}개 섹션 · {doc.quiz?.length || 0}개 퀴즈
                            </p>
                            {doc.estimated_minutes && (
                              <p className="text-xs text-gray-400">약 {doc.estimated_minutes}분</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
