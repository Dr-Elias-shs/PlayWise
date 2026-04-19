# PlayWise | School Gaming Hub

PlayWise is a tablet-first educational gaming platform designed for managed school environments. It features a scalable hub architecture and real-time multiplayer capabilities.

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development Mode
Runs both the Next.js app and the Socket.io server.
```bash
npm run dev
```
Visit: `http://localhost:3000`

### 3. Production Build
```bash
npm run build
npm start
```

## 🏗️ Architecture Decisions

### 1. Hybrid Next.js + Socket.io Server
We use a custom `server.ts` to host both the frontend and the real-time engine in a single process. This simplifies deployment and ensures that classroom rooms are managed reliably without external service dependencies.

### 2. PWA & Tablet-First Design
- **Standalone Mode:** Configured via `manifest.json` to behave like a native app.
- **Orientation Lock:** Forced to landscape for optimal gaming UX.
- **Large Touch Targets:** All interactive elements use a minimum 44px hit area for easy student interaction.

### 3. Scalable State Management
- **Zustand:** Used for low-boilerplate, high-performance state management.
- **Decoupled Game Logic:** The game loop in `MultiplayerGame.tsx` is independent of the Hub, making it easy to add new games (e.g., "Fraction Heroes") by creating new components.

### 4. Multiplayer Room Logic
Students join "rooms" (classrooms). The server tracks scores in real-time and broadcasts a unified leaderboard, creating an engaging competitive environment.

## 🛡️ Intune / Managed Web App Path
To deploy to school tablets:
1. Provide the production URL to the **Microsoft Intune** console.
2. Create a **Managed Web App**.
3. Use the `manifest.json` icons for the home screen appearance.
4. Set the "Display" mode to "Standalone" to hide browser controls.

---

**Built with Next.js, TypeScript, Tailwind CSS, Framer Motion, and Socket.io.**