'use client';

import { GuidelineWithMatchResult } from './types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface GuidelinesSidebarProps {
  activeGuidelines: GuidelineWithMatchResult[];
  isVisible: boolean;
}

export default function GuidelinesSidebar({ activeGuidelines, isVisible }: GuidelinesSidebarProps) {
  if (!isVisible) return null;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    if (score >= 4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (applies: boolean) => {
    return applies ? (
      <CheckCircleIcon className="h-5 w-5 text-green-600" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-600" />
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5" />
          Active Guidelines
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {activeGuidelines.length} guideline{activeGuidelines.length !== 1 ? 's' : ''} evaluated
        </p>
      </div>

      <div className="p-4 space-y-4">
        {activeGuidelines.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <InformationCircleIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No guidelines evaluated yet.</p>
            <p className="text-xs mt-1">Start a conversation to see guidelines in action.</p>
          </div>
        ) : (
          activeGuidelines.map((guideline) => (
            <div key={guideline.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {/* Header with title and status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800 text-sm mb-1">
                    {guideline.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {getScoreIcon(guideline.matchResult.applies)}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(guideline.matchResult.score)}`}>
                      Score: {guideline.matchResult.score}/10
                    </span>
                  </div>
                </div>
              </div>

              {/* Condition and Action */}
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Condition
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    {guideline.condition}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Action
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    {guideline.action}
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-white rounded-md p-3 border border-gray-100">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Analysis
                </label>
                <p className="text-sm text-gray-700 mt-1">
                  {guideline.matchResult.reason}
                </p>
              </div>

              {/* Metadata */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Category: {guideline.category}</span>
                  <span>Priority: {guideline.priority}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
