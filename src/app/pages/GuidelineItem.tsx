'use client';

import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Guideline } from './types';

interface GuidelineItemProps {
  guideline: Guideline;
  onEdit: () => void;
  onDelete: () => void;
  isActive: boolean;
  isAccomplished: boolean;
}

export default function GuidelineItem({ guideline, onEdit, onDelete, isActive, isAccomplished }: GuidelineItemProps) {
  const borderColor = isAccomplished
    ? 'border-green-400'
    : isActive
    ? 'border-blue-500'
    : 'border-gray-200';

  return (
    <div className={`group bg-white p-4 rounded-lg border hover:shadow-md transition-all ${borderColor}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-800">{guideline.title}</h3>
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            <span className="font-medium text-gray-600">When:</span> {guideline.condition}
          </p>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            <span className="font-medium text-gray-600">Then:</span> {guideline.action}
          </p>
        </div>
        
        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}