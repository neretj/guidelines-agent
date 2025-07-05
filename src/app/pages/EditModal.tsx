'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Guideline } from './types';

interface EditModalProps {
  guideline: Guideline | null;
  onSave: (guideline: Guideline) => void;
  onCancel: () => void;
}

export default function EditModal({ guideline, onSave, onCancel }: EditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    condition: '',
    action: '',
    priority: 10,
    category: 'communication',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (guideline) {
      setFormData({
        title: guideline.title,
        condition: guideline.condition,
        action: guideline.action,
        priority: guideline.priority,
        category: guideline.category,
      });
    }
  }, [guideline]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priority' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const finalGuideline = {
      ...guideline,
      ...formData,
    };

    await onSave(finalGuideline as Guideline);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            {guideline ? 'Edit Guideline' : 'Add New Guideline'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Define when a guideline should trigger and what action to take.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="A brief, descriptive title"
            />
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">Condition (When)</label>
            <textarea
              id="condition"
              name="condition"
              required
              rows={4}
              value={formData.condition}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe when this guideline should be triggered..."
            />
          </div>

          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">Action (Then)</label>
            <textarea
              id="action"
              name="action"
              required
              rows={4}
              value={formData.action}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what the agent should do..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                id="priority"
                name="priority"
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Higher numbers have more importance.</p>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="communication">Communication</option>
                <option value="sales">Sales</option>
                <option value="policies">Policies</option>
                <option value="support">Support</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {isSaving ? 'Saving...' : (guideline ? 'Update Guideline' : 'Create Guideline')}
          </button>
        </div>
      </div>
    </div>
  );
}