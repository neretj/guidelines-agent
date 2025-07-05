'use client';

import { PaperAirplaneIcon, ArrowPathIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { Message } from './types';

interface ChatPanelProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onResetSession: () => void;
  showSidebar?: boolean;
}

export default function ChatPanel({ messages, input, onInputChange, onSubmit, isLoading, onResetSession, showSidebar = false }: ChatPanelProps) {
  return (
    <div className="flex-1 flex flex-col bg-white h-screen">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Test Chat</h2>
        <button onClick={onResetSession} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5">
          <ArrowPathIcon className="h-4 w-4" />
          Reset
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-16">
            <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-2" />
            <p>Start a conversation to test guidelines.</p>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm ${
                  message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-500">Typing...</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder="Type your message..."
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}