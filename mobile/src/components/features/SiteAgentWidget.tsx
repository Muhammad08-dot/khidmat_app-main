import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import {
  Bot,
  X,
  Send,
  Trash2,
  Sparkles,
} from "lucide-react-native";
import { askSiteAgent } from "../../services/gemini";
import { Icon } from "../ui/Icon";

interface Message {
  role: "user" | "agent";
  text: string;
}

const WELCOME: Message = {
  role: "agent",
  text: "Hello! I am the Khidmat Support Agent. How can I help you with our platform today?",
};

const SUGGESTIONS = [
  "How do I book a provider?",
  "What are the pricing details?",
  "How do I become a provider?",
];

/** Floating, bottom-docked support agent chat (port of the web Rnd widget —
 *  draggable/resizable is dropped for a stable panel on mobile). */
export const SiteAgentWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const scrollToBottom = () =>
    scrollRef.current?.scrollToEnd({ animated: true });

  useEffect(() => {
    if (isOpen) setTimeout(scrollToBottom, 100);
  }, [messages, isTyping, isOpen]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isTyping) return;
    setInput("");
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsTyping(true);
    try {
      const reply = await askSiteAgent(text);
      setMessages((prev) => [...prev, { role: "agent", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Sorry, I encountered an error connecting to our support system. Please try again later.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setShowSuggestions(true);
  };

  const panelHeight = Math.min(height * 0.82, 640);

  const FAB = (
    <Pressable
      onPress={() => setIsOpen((o) => !o)}
      className={`absolute z-40 items-center justify-center rounded-full ${
        isOpen ? "bg-ink" : "bg-primary"
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <Pressable
              className="absolute inset-0"
              onPress={() => setIsOpen(false)}
            />
            <MotiView
              from={{ translateY: 40, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              style={{ height: panelHeight, paddingBottom: insets.bottom }}
              className="bg-[#0B1220] overflow-hidden"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between bg-emerald-600 px-4 py-3.5">
                <View className="flex-row items-center gap-2">
                  <Icon icon={Bot} color="#fff" size={20} />
                  <Text className="font-display text-sm font-semibold text-white">
                    Khidmat Support
                  </Text>
                </View>
                <View className="flex-row items-center gap-4">
                  <Pressable onPress={clearChat}>
                    <Icon icon={Trash2} color="rgba(255,255,255,0.85)" size={16} />
                  </Pressable>
                  <Pressable onPress={() => setIsOpen(false)}>
                    <Icon icon={X} color="rgba(255,255,255,0.85)" size={20} />
                  </Pressable>
                </View>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                className="flex-1 bg-[#0F172A]"
                contentContainerStyle={{ padding: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {messages.map((msg, idx) => (
                  <View
                    key={idx}
                    className={`mb-3 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <Text
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "rounded-br-sm bg-emerald-600 text-white"
                          : "rounded-bl-sm bg-slate-700 text-slate-200"
                      }`}
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}
                {isTyping && (
                  <View className="mb-3 items-start">
                    <View className="flex-row items-center gap-2 rounded-2xl rounded-bl-sm bg-slate-700 px-3.5 py-2.5">
                      <ActivityIndicator size="small" color="#94a3b8" />
                      <Text className="text-xs text-slate-300">Typing...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Suggestions */}
              {showSuggestions && messages.length <= 2 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="border-t border-slate-700/50 bg-[#0B1220] px-3 py-2"
                >
                  {SUGGESTIONS.map((s, i) => (
                    <Pressable
                      key={i}
                      onPress={() => send(s)}
                      className="mr-2 rounded-full border border-emerald-500/30 bg-slate-800 px-3 py-1.5"
                    >
                      <Text className="text-[11px] font-medium text-emerald-400">
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* Input */}
              <View className="flex-row items-center gap-2 border-t border-slate-700 bg-[#0B1220] px-3 py-3">
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => send()}
                  placeholder="Ask about Khidmat..."
                  placeholderTextColor="#64748b"
                  className="flex-1 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white"
                />
                <Pressable
                  onPress={() => send()}
                  disabled={!input.trim() || isTyping}
                  className="rounded-full bg-emerald-600 p-2.5 opacity-100 disabled:opacity-50"
                >
                  <Icon icon={Send} color="#fff" size={18} />
                </Pressable>
              </View>

              <View className="items-center pb-1">
                <Text className="text-[10px] text-slate-500">
                  <Icon icon={Sparkles} color="#64748b" size={10} /> AI-powered
                  by Khidmat
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
