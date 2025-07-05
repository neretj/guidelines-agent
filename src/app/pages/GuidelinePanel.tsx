'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { Guideline } from './types';
import GuidelineItem from './GuidelineItem';

interface GuidelinePanelProps {
  guidelines: Guideline[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddNew: () => void;
  onEdit: (guideline: Guideline) => void;
  onDelete: (id: number) => void;
  activeGuidelineIds: number[];
  accomplishedGuidelineIds: number[];
}

export default function GuidelinePanel({
  guidelines,
  loading,
  searchTerm,
  onSearchChange,
  onAddNew,
  onEdit,
  onDelete,
  activeGuidelineIds,
  accomplishedGuidelineIds,
}: GuidelinePanelProps) {
  return (
    <div className="w-1/3 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Guidelines</h1>
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add New
          </button>
        </div>
        <input
          type="text"
          placeholder="Search guidelines..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : guidelines.length > 0 ? (
          guidelines.map((guideline) => (
            <GuidelineItem
              key={guideline.id}
              guideline={guideline}
              onEdit={() => onEdit(guideline)}
              onDelete={() => onDelete(guideline.id)}
              isActive={activeGuidelineIds.includes(guideline.id)}
              isAccomplished={accomplishedGuidelineIds.includes(guideline.id)}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 mt-8">No guidelines found.</p>
        )}
      </div>
    </div>
  );
}