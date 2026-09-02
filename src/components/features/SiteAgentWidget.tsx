import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Grip, Trash2 } from 'lucide-react';
import { askSiteAgent } from '../../services/gemini';
import { Rnd } from 'react-rnd';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

export const SiteAgentWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Hello! I am the Khidmat Support Agent. How can I help you with our platform today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showSuggestions, setShowSuggestions] = useState(true);
  const suggestions = [
    "How do I book a provider?",
    "What are the pricing details?",
    "How do I become a provider?"
  ];

  const handleSuggestionClick = (text: string) => {
    setShowSuggestions(false);
    handleSend(undefined, text);
  };

  // RND Window State
  const defaultWidth = 350;
  const defaultHeight = 450;
  const defaultX = typeof window !== 'undefined' ? window.innerWidth - defaultWidth - 24 : 0;
  const defaultY = typeof window !== 'undefined' ? window.innerHeight - defaultHeight - 100 : 0;

  const [rndState, setRndState] = useState({
    width: defaultWidth,
    height: defaultHeight,
    x: defaultX,
    y: defaultY
  });

  useEffect(() => {
    // Load session storage state
    const saved = sessionStorage.getItem('agentWidgetRnd');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const currentWidth = parsed.width || defaultWidth;
        const currentHeight = parsed.height || defaultHeight;
        const validatedX = Math.max(10, Math.min(parsed.x, window.innerWidth - currentWidth - 10));
        const validatedY = Math.max(10, Math.min(parsed.y, window.innerHeight - currentHeight - 10));
        setRndState({
          width: currentWidth,
          height: currentHeight,
          x: validatedX,
          y: validatedY
        });
      } catch (e) {
        console.error("Failed to parse saved widget state", e);
      }
    }
    
    // Handle mobile responsiveness
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveRndState = (newState: typeof rndState) => {
    setRndState(newState);
    sessionStorage.setItem('agentWidgetRnd', JSON.stringify(newState));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const userMsg = overrideText || input.trim();
    if (!userMsg || isTyping) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const responseText = await askSiteAgent(userMsg);
      setMessages(prev => [...prev, { role: 'agent', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: 'Sorry, I encountered an error connecting to our support system. Please try again later.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'agent', text: 'Hello! I am the Khidmat Support Agent. How can I help you with our platform today?' }]);
    setShowSuggestions(true);
  };

  // The inner chat UI is identical for both mobile (fullscreen) and desktop (Rnd)
  const ChatInner = () => (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden rounded-none md:rounded-2xl relative group">
      {/* Header - Drag Handle */}
      <div className="bg-emerald-600 p-4 flex justify-between items-center drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <Bot className="text-white w-5 h-5" />
          <h3 className="text-white font-medium">Khidmat Support</h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={clearChat}
            className="text-white/80 hover:text-white transition-colors cursor-pointer z-50"
            title="Clear Chat"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors cursor-pointer z-50"
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking close
            onTouchStart={(e) => e.stopPropagation()}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50 cursor-auto">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-br-sm' 
                  : 'bg-slate-700 text-slate-200 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-200 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions Area */}
      {showSuggestions && messages.length <= 2 && (
        <div className="px-3 pb-2 pt-2 bg-slate-900 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden cursor-auto border-t border-slate-700/50">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="whitespace-nowrap text-[11px] font-medium bg-slate-800 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full hover:bg-slate-700 hover:border-emerald-500 transition-colors active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form 
        onSubmit={handleSend} 
        className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2 cursor-auto"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about Khidmat..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Resize Handle Icon (Hidden on mobile, slightly visible on desktop) */}
      {!isMobile && (
        <Grip className="absolute bottom-1 right-1 w-4 h-4 text-slate-500 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );

  return (
    <>
      {isOpen && (
        isMobile ? (
          // Mobile Fullscreen Wrapper
          <div className="fixed inset-0 z-[60] bg-slate-900">
            {ChatInner()}
          </div>
        ) : (
          // Desktop Draggable/Resizable Wrapper
          <div className="fixed inset-0 z-[60] pointer-events-none">
            <Rnd
              size={{ width: rndState.width, height: rndState.height }}
              position={{ x: rndState.x, y: rndState.y }}
              onDragStop={(_e: any, d: any) => {
                saveRndState({ ...rndState, x: d.x, y: d.y });
              }}
              onResizeStop={(_e: any, _direction: any, ref: any, _delta: any, position: any) => {
                saveRndState({
                  width: parseInt(ref.style.width, 10),
                  height: parseInt(ref.style.height, 10),
                  x: position.x,
                  y: position.y
                });
              }}
              minWidth={350}
              minHeight={450}
              maxWidth={800}
              maxHeight="90vh"
              dragHandleClassName="drag-handle"
              bounds="parent"
              className="pointer-events-auto"
              enableResizing={{
                top: true, right: true, bottom: true, left: true,
                topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
              }}
            >
              {ChatInner()}
            </Rnd>
          </div>
        )
      )}

      {/* Floating Toggle Button */}
      <div className={`fixed bottom-20 md:bottom-6 right-6 z-50 ${isMobile && isOpen ? 'hidden' : 'block'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${isOpen ? 'bg-slate-800 text-slate-400' : 'bg-emerald-600 text-white shadow-lg hover:shadow-emerald-900/50 hover:-translate-y-1'} p-4 rounded-full transition-all duration-200 focus:outline-none`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};
