# Setup & Local Development Guide

## Prerequisites
- **Node.js**: v18 or newer
- **npm** or **yarn**
- **Expo Go** app installed on your physical device (or Android Studio / Xcode for emulators)

---

## 1. Environment Configuration

### Root `.env` (Mobile App)
Copy the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```
Ensure the `EXPO_PUBLIC_AGENT_SERVER_URL` is set to your local IP address if testing on a physical device, or `http://localhost:8787` for emulators.

### Agent Server `.env`
Navigate to the `agent-server` folder and copy the template:
```bash
cd agent-server
cp .env.example .env
```
Fill in the `GEMINI_API_KEY` (and `OPENAI_API_KEY` if using ChatGPT for the healing agent).

---

## 2. Running the Agent Server
The Agent Server **must** be running for AI features (intent parsing, pricing, ranking) to work.

```bash
cd agent-server
npm install
npm run dev
```
The server will start on `http://localhost:8787`.

---

## 3. Running the Mobile App
Open a new terminal window at the project root:

```bash
npm install
npx expo start
```
- Press **`a`** to open the Android emulator.
- Press **`i`** to open the iOS simulator.
- Or scan the QR code with your phone's camera (iOS) or the Expo Go app (Android).

> **Note**: If you are using a physical device, ensure both your computer and phone are on the same Wi-Fi network. Update `EXPO_PUBLIC_AGENT_SERVER_URL` in `.env` to your computer's local IP (e.g., `http://192.168.1.5:8787`).
