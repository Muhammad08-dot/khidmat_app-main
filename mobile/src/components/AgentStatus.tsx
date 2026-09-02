import React from 'react';
import { View, Text } from 'react-native';
import { MotiView } from 'moti';
import { Brain, Code, Sparkles } from 'lucide-react-native';

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'thinking';
  icon: 'brain' | 'code' | 'sparkles';
}

interface AgentStatusProps {
  agents?: AgentInfo[];
  className?: string;
}

const DEFAULT_AGENTS: AgentInfo[] = [
  { id: '1', name: 'Claude Code', status: 'active', icon: 'brain' },
  { id: '2', name: 'Codex', status: 'idle', icon: 'code' },
  { id: '3', name: 'Gemini', status: 'thinking', icon: 'sparkles' },
];

export function AgentStatus({ agents = DEFAULT_AGENTS, className = '' }: AgentStatusProps) {
  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'thinking').length;

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'brain': return <Brain size={20} color={color} />;
      case 'code': return <Code size={20} color={color} />;
      case 'sparkles': return <Sparkles size={20} color={color} />;
      default: return <Brain size={20} color={color} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981'; // emerald-500
      case 'idle': return '#94a3b8'; // slate-400
      case 'error': return '#ef4444'; // red-500
      case 'thinking': return '#f59e0b'; // amber-500
      default: return '#94a3b8';
    }
  };

  return (
    <View className={`p-4 rounded-2xl border border-white/10 bg-black/40 overflow-hidden ${className}`}>
      {/* Frosted Glass Background Overlay */}
      <View className="absolute inset-0 bg-white/5" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 z-10">
        <Text className="text-white font-display text-lg font-bold">AI Agents</Text>
        <View className="flex-row items-center bg-white/10 px-3 py-1 rounded-full">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-emerald-400 text-xs font-medium">{activeCount} / {agents.length} Online</Text>
        </View>
      </View>

      {/* Agents List */}
      <View className="space-y-3 z-10">
        {agents.map((agent, index) => {
          const color = getStatusColor(agent.status);
          const isAnimating = agent.status === 'active' || agent.status === 'thinking';

          return (
            <MotiView
              key={agent.id}
              from={{ opacity: 0, translateY: 10, scale: 0.95 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{ type: 'spring', delay: index * 150 }}
              className="flex-row items-center p-3 rounded-xl bg-white/5 border border-white/5"
            >
              {/* Icon Container with Moti Pulse if Active/Thinking */}
              <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3 relative">
                {isAnimating && (
                  <MotiView
                    from={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: 'timing', duration: 1500, loop: true }}
                    style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: color }}
                  />
                )}
                {renderIcon(agent.icon, color)}
              </View>

              <View className="flex-1">
                <Text className="text-white text-base font-medium">{agent.name}</Text>
                <Text className="text-slate-400 text-xs capitalize">{agent.status}</Text>
              </View>

              {/* Status Dot */}
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}
