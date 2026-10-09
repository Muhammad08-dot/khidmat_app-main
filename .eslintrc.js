module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  ignorePatterns: ['dist/', '.expo/', 'expo-env.d.ts', 'agent-server/'],
  rules: {
    'prettier/prettier': 'warn',
    // Legacy pattern across existing screens (loading/error state set inside effects).
    // Tracked as tech debt; refactor to React Query-driven state instead of silencing forever.
    'react-hooks/set-state-in-effect': 'warn',
  },
};
