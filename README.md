# 🎵 Music Flow

**Music Flow** is a high-performance, production-ready music streaming platform built with Next.js and Node.js. It leverages real-time audio extraction and transcoding to provide a seamless listening experience.

## ✨ Features
- **Real-time Streaming**: Instant audio extraction from YouTube using `yt-dlp`.
- **On-the-fly Transcoding**: High-quality MP3 transcoding via `ffmpeg` for universal browser support.
- **AI Recommendations**: Intelligent song suggestions based on user taste and interactions.
- **Smart Search**: Fast and accurate search results powered by `yt-search`.
- **PWA Ready**: Installable as a standalone app on Android, iOS, and Windows.
- **Responsive UI**: Modern, glassmorphism-inspired design with smooth animations.
- **Auth & Playlists**: Personalized user profiles and custom music organization.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS, Zustand, Framer Motion.
- **Backend**: Node.js, Express, MongoDB, Mongoose.
- **Media Pipeline**: `yt-dlp` (Extraction), `ffmpeg` (Transcoding).
- **Security**: Helmet, CORS, JWT.

## 🚀 Installation

### Prerequisites
- Node.js (v18+)
- MongoDB
- FFmpeg (Installed on system PATH)

### Clone the Repository
```bash
git clone https://github.com/aziz712/Music-Flow.git
cd Music-Flow
```

### Backend Setup
```bash
cd backend
npm install
# Create .env with MONGODB_URI and JWT_SECRET
npm run start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🏗️ Streaming Architecture
The app follows a robust streaming pipeline:
1. **Frontend**: Requests a stream via `/api/songs/download`.
2. **Backend**: Discovers the best audio format using `yt-dlp`.
3. **Pipeline**: Pipes the raw stream into `ffmpeg` for MP3 transcoding.
4. **Output**: Streams 128kbps MP3 data to the browser using chunked transfer encoding.

## 🧠 AI Recommendation System
Music Flow tracks user plays and likes to build a local "taste vector". It uses a hybrid scoring engine to recommend tracks that align with the user's listening habits.

## 📱 PWA Installation
Music Flow is fully PWA-compliant. To install:
- **Desktop**: Click the install icon in the URL bar.
- **Mobile**: Select "Add to Home Screen" from your browser menu.

## 📄 License
This project is licensed under the MIT License.
