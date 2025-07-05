'use client';

import { useState, useEffect } from 'react';
import { Guideline, Message, ActiveGuideline, GuidelineMatchResult, GuidelineWithMatchResult } from './types';
import GuidelinePanel from './GuidelinePanel';
import ChatPanel from './ChatPanel';
import EditModal from './EditModal';
import GuidelinesSidebar from './GuidelinesSidebar';

export default function Dashboard() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeGuidelines, setActiveGuidelines] = useState<ActiveGuideline[]>([]);
  const [accomplishedGuidelines, setAccomplishedGuidelines] = useState<number[]>([]);
  const [guidelineMatchingResults, setGuidelineMatchingResults] = useState<GuidelineMatchResult[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const loadGuidelines = async () => {
      try {
        const response = await fetch('/api/guidelines');
        if (response.ok) {
          const data = await response.json();
          setGuidelines(data);
        }
      } catch (error) {
        console.error('Error loading guidelines:', error);
      } finally {
        setLoading(false);
      }
    };
    loadGuidelines();
  }, []);

  const handleSubmitChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoadingChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          sessionId: sessionId 
        }),
      });

      if (!response.ok) {
        throw new Error('Server response error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.sessionId && !sessionId) {
                setSessionId(parsed.sessionId);
              }
              
              if (parsed.activeGuidelines) {
                setActiveGuidelines(parsed.activeGuidelines);
              }
              
              if (parsed.guidelineMatchingResults) {
                setGuidelineMatchingResults(parsed.guidelineMatchingResults);
                setShowSidebar(true);
              }
              
              if (parsed.accomplishedGuidelines) {
                setAccomplishedGuidelines(parsed.accomplishedGuidelines);
              }
              
              if (parsed.content) {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                );
              }
            } catch (parseError) {
              console.error('Error parsing JSON:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleSaveGuideline = async (guidelineToSave: Guideline) => {
    const isNew = !guidelineToSave.id;
    const url = isNew ? '/api/guidelines' : `/api/guidelines/${guidelineToSave.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guidelineToSave),
      });

      if (response.ok) {
        const savedGuideline = await response.json();
        if (isNew) {
          setGuidelines(prev => [...prev, savedGuideline]);
        } else {
          setGuidelines(prev => prev.map(g => (g.id === savedGuideline.id ? savedGuideline : g)));
        }
      }
    } catch (error) {
      console.error('Error saving guideline:', error);
    } finally {
      setIsEditing(false);
      setSelectedGuideline(null);
    }
  };

  const handleDeleteGuideline = async (id: number) => {
    if (!confirm('Are you sure you want to delete this guideline?')) return;
    try {
      const response = await fetch(`/api/guidelines/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setGuidelines(prev => prev.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error('Error deleting guideline:', error);
    }
  };
  
  const handleResetSession = () => {
    setMessages([]);
    setActiveGuidelines([]);
    setAccomplishedGuidelines([]);
    setGuidelineMatchingResults([]);
    setSessionId(null);
    setShowSidebar(false);
  };

  const filteredGuidelines = guidelines.filter(g =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Combine active guidelines with their matching results
  const activeGuidelinesWithResults: GuidelineWithMatchResult[] = guidelineMatchingResults.map(result => {
    const guideline = guidelines.find(g => g.id === result.guideline_id);
    if (!guideline) return null;
    return {
      ...guideline,
      matchResult: result
    };
  }).filter(Boolean) as GuidelineWithMatchResult[];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <GuidelinePanel
        guidelines={filteredGuidelines}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddNew={() => { setSelectedGuideline(null); setIsEditing(true); }}
        onEdit={(guideline) => { setSelectedGuideline(guideline); setIsEditing(true); }}
        onDelete={handleDeleteGuideline}
        activeGuidelineIds={activeGuidelines.map(ag => ag.id)}
        accomplishedGuidelineIds={accomplishedGuidelines}
      />

      <ChatPanel
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmitChat}
        isLoading={isLoadingChat}
        onResetSession={handleResetSession}
        showSidebar={showSidebar}
      />

      <GuidelinesSidebar
        activeGuidelines={activeGuidelinesWithResults}
        isVisible={showSidebar}
      />

      {isEditing && (
        <EditModal
          guideline={selectedGuideline}
          onSave={handleSaveGuideline}
          onCancel={() => { setIsEditing(false); setSelectedGuideline(null); }}
        />
      )}
    </div>
  );
}