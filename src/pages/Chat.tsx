import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getDocument, 
  sendChatMessage, 
  listenToChatMessages 
} from '../services/firebase';
import { Card, EmptyState } from '../components/ui/SharedUI';
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  Clock, 
  MapPin,
  Phone,
  Info,
  Shield,
  Navigation
} from 'lucide-react';

interface Booking {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  date: string;
  timeSlot: string;
  address: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  totalPrice: number;
  distanceKm: number;
}

interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { user, userProfile } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isWorker = userProfile?.current_mode === 'worker';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Fetch Booking Details
  useEffect(() => {
    if (!bookingId) {
      setError("No booking context provided for chat.");
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const data = await getDocument('bookings', bookingId);
        if (data) {
          setBooking(data as Booking);
        } else {
          setError("Booking details not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // Listen to Chat Messages in Real-time
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = listenToChatMessages(bookingId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [bookingId]);

  // Sync booking status updates in real-time
  useEffect(() => {
    if (!bookingId) return;

    const interval = setInterval(async () => {
      try {
        const data = await getDocument('bookings', bookingId);
        if (data) {
          const freshBooking = data as Booking;
          setBooking(prev => {
            if (prev?.status !== freshBooking.status) {
              return freshBooking;
            }
            return prev;
          });
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [bookingId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !bookingId) return;

    const textToSend = inputText;
    setInputText('');

    try {
      // Use proper display name from user profile
      const senderName = userProfile?.name || user.email?.split('@')[0] || 'User';
      await sendChatMessage(
        bookingId,
        user.uid,
        senderName,
        textToSend
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 flex flex-col items-center justify-center min-h-[60vh] text-ink dark:text-white">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium text-ink/60 dark:text-slate-400">Loading chat...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="pt-28 px-margin-mobile max-w-md mx-auto">
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="Chat Context Missing"
            description={error || "No booking context was found for this discussion thread."}
            actionLabel="Back to Bookings"
            onAction={() => navigate('/bookings')}
          />
        </Card>
      </div>
    );
  }

  // Determine chat partner based on current user role
  const chatPartnerName = isWorker ? booking.customerName : booking.providerName;
  const chatPartnerRole = isWorker ? 'Client' : booking.providerCategory;
  const chatPartnerInitials = chatPartnerName
    ? chatPartnerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isChatLocked = ['completed', 'closed', 'cancelled'].includes(booking.status);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Confirmed' };
      case 'in_progress':
        return { classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'In Progress' };
      case 'completed':
        return { classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'Completed' };
      case 'closed':
        return { classes: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', label: 'Closed' };
      case 'cancelled':
        return { classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Cancelled' };
      case 'pending':
      default:
        return { classes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', label: 'Pending' };
    }
  };

  const statusBadge = getStatusBadge(booking.status);

  return (
    <div className="pt-20 pb-0 h-screen flex flex-col w-full bg-[#F8F8F4] dark:bg-[#0C1117]">

      {/* CHAT CONTAINER */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-hidden">
        
        {/* ─── Chat Header ─── */}
        <div className="bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 px-3 md:px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
            {/* Back button */}
            <button
              onClick={() => navigate('/inbox')}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-ink dark:text-white transition-colors shrink-0"
              aria-label="Back to messages"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Avatar */}
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/25 dark:to-primary/10 flex items-center justify-center border border-primary/10 shrink-0">
              <span className="text-primary dark:text-primary-fixed font-bold text-xs md:text-sm">{chatPartnerInitials}</span>
            </div>
            
            {/* Name + Role */}
            <div className="min-w-0">
              <h2 className="font-bold text-sm md:text-base text-ink dark:text-white leading-tight truncate capitalize">
                {chatPartnerName}
              </h2>
              <span className="text-[10px] md:text-[11px] text-ink/50 dark:text-slate-400 block">
                {chatPartnerRole} • {booking.address.split(',')[0]}
              </span>
            </div>
          </div>

          {/* Status + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] md:text-[10px] font-bold ${statusBadge.classes}`}>
              {statusBadge.label}
            </span>
            {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
              <button 
                onClick={() => navigate(`/track/${booking.bookingId}`)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft cursor-pointer hover:bg-primary-hover active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Track Location</span>
              </button>
            )}
            {booking.customerPhone && isWorker && (
              <a 
                href={`tel:${booking.customerPhone}`}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-primary transition-colors"
                aria-label="Call customer"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* ─── Messages Area ─── */}
        <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-3">
          
          {/* Service details banner */}
          <div className="max-w-sm mx-auto text-center bg-white dark:bg-slate-900/80 p-3 md:p-4 rounded-2xl border border-border dark:border-slate-800 shadow-sm mb-2">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[9px] uppercase font-mono tracking-widest text-ink/40 dark:text-slate-500 font-bold">Service Details</span>
            </div>
            <p className="text-xs font-bold text-ink dark:text-white">{booking.providerCategory} • Rs. {booking.totalPrice}</p>
            <p className="text-[10px] text-ink/50 dark:text-slate-500 mt-0.5">{booking.date} • {booking.timeSlot}</p>
            <p className="text-[10px] text-ink/50 dark:text-slate-500 flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-primary/60" /> {booking.address}
            </p>
          </div>

          {/* Messages */}
          {messages.map((msg, index) => {
            // Parse system notification messages
            let isSystemMessage = false;
            let displayMsgText = msg.text;
            
            try {
              if (msg.text.startsWith('{') && msg.text.endsWith('}')) {
                const parsed = JSON.parse(msg.text);
                if (parsed.isSystemEvent) {
                  isSystemMessage = true;
                  displayMsgText = parsed.text;
                }
              }
            } catch (e) {
              // ignore parse errors
            }

            if (isSystemMessage) {
              return (
                <div key={msg.id || index} className="flex justify-center my-3">
                  <div className="bg-sky-500/8 text-sky-700 dark:text-sky-400 border border-sky-500/15 text-[10px] md:text-[11px] font-semibold py-1.5 px-4 rounded-full max-w-xs md:max-w-sm text-center flex items-center gap-1.5">
                    <Info className="w-3 h-3 shrink-0" />
                    {displayMsgText}
                  </div>
                </div>
              );
            }

            const isMe = msg.senderId === user?.uid;
            const msgTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div
                key={msg.id || index}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Other person's avatar on received messages */}
                {!isMe && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mr-2 mt-1 border border-primary/10">
                    <span className="text-primary dark:text-primary-fixed text-[9px] font-bold">{chatPartnerInitials}</span>
                  </div>
                )}

                <div
                  className={`max-w-[78%] md:max-w-[65%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isMe 
                      ? 'bg-primary text-on-primary rounded-br-md shadow-sm' 
                      : 'bg-white dark:bg-slate-900 border border-border dark:border-slate-800 text-ink dark:text-slate-100 rounded-bl-md shadow-sm'
                  }`}
                >
                  {/* Sender name label on received messages */}
                  {!isMe && (
                    <span className="text-[10px] font-bold text-primary dark:text-primary-fixed block mb-0.5 capitalize">
                      {msg.senderName}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words">{displayMsgText}</p>
                  
                  {/* Timestamp */}
                  <span className={`text-[9px] block mt-1 text-right font-medium ${isMe ? 'text-white/50' : 'text-ink/30 dark:text-slate-600'}`}>
                    {msgTime}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Box ─── */}
        <div className="bg-white dark:bg-slate-900 border-t border-border dark:border-slate-800 px-3 md:px-5 py-3 shrink-0">
          {isChatLocked ? (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-ink/40 dark:text-slate-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>This conversation is {booking.status === 'cancelled' ? 'cancelled' : 'closed'}. Messaging is disabled.</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-border dark:border-slate-800 rounded-2xl py-3 px-4 text-sm text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-ink/30 dark:placeholder:text-slate-600"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
