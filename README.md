# Time Tracker Application

A comprehensive time tracking solution with screenshot capabilities, team management, and detailed reporting. Built with React, Supabase, and Electron.

![Time Tracker Screenshot](https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&q=80&w=1200)

## 🌟 Features

- ⏱️ Real-time time tracking
- 📸 Automatic screenshots (web & desktop)
- 👥 Team management
- 📊 Detailed reports and analytics
- 🔐 Role-based access control
- 💻 Cross-platform support (Web & Desktop)

## 🏗️ Architecture

### High-Level System Design

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Electron App   │     │    Supabase     │
│   (React/Vite)  │     │  (Desktop App)  │     │   (Backend)     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ - Time Tracking │     │ - Screen Capture│     │ - Authentication│
│ - Team Views    │     │ - Webcam Capture│     │ - Database      │
│ - Admin Panel   │     │ - System Tray   │     │ - File Storage  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                │
                         ┌──────┴───────┐
                         │   Storage    │
                         │ (Screenshots)│
                         └──────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Git

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/time-tracker.git
   cd time-tracker
   ```

2. Install dependencies:
   ```bash
   # Web application
   npm install

   # Desktop application
   cd electron-time-tracker
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the Applications

#### Web Application
```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

#### Desktop Application
```bash
# Development
cd electron-time-tracker
npm run dev

# Build for all platforms
npm run dist

# Build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### Building and Distributing Desktop App

1. Prepare the environment:
   ```bash
   cd electron-time-tracker
   npm install
   ```

2. Build the application:
   ```bash
   # For all platforms
   npm run dist

   # For specific platforms
   npm run dist:win
   npm run dist:mac
   npm run dist:linux
   ```

3. Find the built applications in:
   ```
   electron-time-tracker/release/
   ├── TimeTrackerSetup.exe     # Windows installer
   ├── TimeTracker.dmg          # macOS disk image
   └── TimeTracker.AppImage     # Linux AppImage
   ```

4. For administrators:
   - Upload new versions through the web interface
   - Access the upload feature in the Time Tracker tab
   - Supported formats: .exe, .dmg, .AppImage

5. For users:
   - Download the application from the Time Tracker tab
   - Choose the appropriate version for your operating system
   - Install and run the application
   - Log in with your existing credentials

## 🔒 Security Features

- Secure authentication via Supabase
- Automatic session management
- Encrypted data transmission
- Secure file storage for screenshots
- Role-based access control

## 💻 Development Stack

### Web Application
- React 18
- Vite
- TypeScript
- Tailwind CSS
- Supabase

### Desktop Application
- Electron
- TypeScript
- Node.js
- Electron Builder

## 📁 Project Structure

```
├── src/                  # Web application source
├── electron-time-tracker/# Desktop application
│   ├── src/
│   │   ├── main/        # Main process
│   │   ├── preload/     # Preload scripts
│   │   └── renderer/    # Renderer process
│   └── package.json
├── supabase/            # Database migrations
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.