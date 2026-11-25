import React, { useState, useRef, useEffect, ElementRef } from 'react';
import { BRAND } from '@/src/theme/colors';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Bot, X, Send, Trash2, Sparkles } from 'lucide-react-native';
import { askSiteAgent } from '@/src/services/api/agentClient';
import { useAuth } from '@/src/context/AuthContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Icon } from '../ui/Icon';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

const SUGGESTIONS = [
  'How do I book a provider?',
  'What are the pricing details?',
  'How do I become a provider?',
];

interface SiteAgentWidgetProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

/** Floating, bottom-docked support agent chat (port of the web Rnd widget —
 *  draggable/resizable is dropped for a stable panel on mobile). */
export const SiteAgentWidget: React.FC<SiteAgentWidgetProps> = ({
  externalOpen,
  onExternalOpenChange,
}) => {
  const { userProfile } = useAuth();
  const { isDark, scaled } = usePreferences();
  const firstName = userProfile?.name?.split(' ')[0] || '';
  const welcomeMsg: Message = {
    role: 'agent',
    text: `Assalamu Alaikum${firstName ? `, ${firstName}` : ''}! Main aapka Khidmat AI Assistant hoon. How can I help you today?`,
  };
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isOpen) : val;
    setInternalOpen(next);
    onExternalOpenChange?.(next);
  };
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<ElementRef<typeof ScrollView> | null>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const scrollToBottom = () => scrollRef.current?.scrollToEnd({ animated: true });

  useEffect(() => {
    if (isOpen) setTimeout(scrollToBottom, 100);
  }, [messages, isTyping, isOpen]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isTyping) return;
    setInput('');
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsTyping(true);
    try {
      const reply = await askSiteAgent(text);
      setMessages((prev) => [...prev, { role: 'agent', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: 'Sorry, I encountered an error connecting to our support system. Please try again later.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([welcomeMsg]);
    setShowSuggestions(true);
  };

  const panelHeight = Math.min(height * 0.82, 640);

  const FAB = (
    <Pressable
      onPress={() => setIsOpen((o) => !o)}
      className={`absolute z-40 items-center justify-center rounded-full ${
        isOpen ? 'bg-ink' : 'bg-primary'
      } shadow-large`}
      style={{
        width: 56,
        height: 56,
        right: 16,
        bottom: insets.bottom + 76,
      }}
    >
      <Icon icon={isOpen ? X : Bot} color="#FFFFFF" size={24} />
    </Pressable>
  );

  return (
    <>
      {isOpen && (
        <Modal
          transparent
          animationType="fade"
          visible={isOpen}
          onRequestClose={() => setIsOpen(false)}
          statusBarTranslucent
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <Pressable className="absolute inset-0" onPress={() => setIsOpen(false)} />
            <MotiView
              from={{ translateY: 40, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 } as any}
              style={{
                height: panelHeight,
                paddingBottom: insets.bottom,
                backgroundColor: isDark ? '#141A17' : '#FBFAF6',
              }}
              className="rounded-t-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <View
                style={{ backgroundColor: '#1F5D3F' }}
                className="flex-row items-center justify-between px-4 py-3.5"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-white/15">
                    <Icon icon={Bot} color="#fff" size={18} />
                  </View>
                  <View>
                    <Text style={{ fontSize: scaled(14) }} className="font-display font-semibold text-white">
                      Khidmat AI Assistant
                    </Text>
                    <Text className="text-[10px] text-emerald-100">Instant support &amp; guidance</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-4">
                  <Pressable onPress={clearChat} hitSlop={8}>
                    <Icon icon={Trash2} color="rgba(255,255,255,0.85)" size={16} />
                  </Pressable>
                  <Pressable onPress={() => setIsOpen(false)} hitSlop={8}>
                    <Icon icon={X} color="rgba(255,255,255,0.9)" size={20} />
                  </Pressable>
                </View>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1, backgroundColor: isDark ? '#141A17' : '#FBFAF6' }}
                contentContainerStyle={{ padding: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {messages.map((msg, idx) => (
                  <View
                    key={idx}
                    className={`mb-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <View
                      style={{
                        backgroundColor:
                          msg.role === 'user' ? '#1F5D3F' : isDark ? '#222B26' : '#FFFFFF',
                        borderColor: msg.role === 'user' ? '#1F5D3F' : isDark ? '#2F3B35' : '#E5E7EB',
                      }}
                      className={`max-w-[82%] rounded-2xl border px-3.5 py-2.5 ${
                        msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                      }`}
                    >
                      <Text
                        style={{
                          fontSize: scaled(13),
                          color: msg.role === 'user' ? '#FFFFFF' : isDark ? '#F3F4F6' : '#1F2937',
                        }}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                ))}
                {isTyping && (
                  <View className="mb-3 items-start">
                    <View
                      style={{ backgroundColor: isDark ? '#222B26' : '#FFFFFF' }}
                      className="flex-row items-center gap-2 rounded-2xl rounded-bl-sm border border-border px-3.5 py-2.5"
                    >
                      <ActivityIndicator size="small" color={BRAND.primary} />
                      <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563' }} className="text-xs">
                        Typing...
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Compact Suggestions (non-stretching) */}
              {showSuggestions && messages.length <= 2 && (
                <View
                  style={{
                    flexGrow: 0,
                    flexShrink: 0,
                    backgroundColor: isDark ? '#1A221E' : '#F3F4F0',
                    borderTopColor: isDark ? '#2A3530' : '#E5E7EB',
                  }}
                  className="border-t px-3 py-2.5"
                >
                  <View className="flex-row flex-wrap gap-2">
                    {SUGGESTIONS.map((s, i) => (
                      <Pressable
                        key={i}
                        onPress={() => send(s)}
                        style={{
                          backgroundColor: isDark ? '#222B26' : '#FFFFFF',
                          borderColor: isDark ? '#34423B' : '#D1FAE5',
                        }}
                        className="rounded-xl border px-3 py-1.5"
                      >
                        <Text
                          style={{
                            fontSize: scaled(11),
                            color: isDark ? '#6EE7B7' : '#1F5D3F',
                          }}
                          className="font-semibold"
                        >
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Input */}
              <View
                style={{
                  backgroundColor: isDark ? '#1A221E' : '#FFFFFF',
                  borderTopColor: isDark ? '#2A3530' : '#E5E7EB',
                }}
                className="flex-row items-center gap-2 border-t px-3 py-3"
              >
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => send()}
                  placeholder="Ask about Khidmat..."
                  placeholderTextColor={BRAND.muted}
                  style={{
                    backgroundColor: isDark ? '#222B26' : '#F9FAFB',
                    borderColor: isDark ? '#34423B' : '#E5E7EB',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: scaled(14),
                  }}
                  className="flex-1 rounded-full border px-4 py-2"
                />
                <Pressable
                  onPress={() => send()}
                  disabled={!input.trim() || isTyping}
                  style={{ backgroundColor: '#1F5D3F' }}
                  className="rounded-full p-2.5 opacity-100 disabled:opacity-40"
                >
                  <Icon icon={Send} color="#fff" size={18} />
                </Pressable>
              </View>

              <View
                style={{ backgroundColor: isDark ? '#1A221E' : '#FFFFFF' }}
                className="items-center pb-1.5"
              >
                <Text className="text-[10px] text-ink/50">
                  <Icon icon={Sparkles} color={BRAND.primary} size={10} /> AI-powered by Khidmat
                </Text>
              </View>
            </MotiView>
          </KeyboardAvoidingView>
        </Modal>
      )}
      {!isOpen && FAB}
    </>
  );
};

export default SiteAgentWidget;
