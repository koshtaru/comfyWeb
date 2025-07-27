# ComfyUI React

A modern, full-featured React frontend for ComfyUI that provides an intuitive interface for AI image generation with real-time WebSocket communication, advanced workflow management, and comprehensive parameter controls.

![ComfyUI React Interface](https://img.shields.io/badge/React-19.1.0-blue?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-7.0.4-purple?logo=vite) ![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-green)

## ✨ Features

### 🎨 **Generation & Workflow**
- **Real-time Generation**: Live progress tracking with WebSocket communication
- **Workflow Upload**: Drag & drop ComfyUI workflow JSON files
- **Parameter Extraction**: Automatic detection and control of generation parameters
- **Batch Generation**: Configure batch size and queue management
- **Progress Visualization**: Real-time progress bars with node execution tracking

### ⚙️ **Parameter Management**
- **Dimension Presets**: Quick selection of common aspect ratios (SD 1.5, SDXL, etc.)
- **Advanced Controls**: CFG Scale, Steps, Seed, and custom parameter inputs
- **Parameter Validation**: Real-time validation with helpful error messages
- **Preset System**: Save, load, and manage parameter configurations

### 🖼️ **Image & History**
- **Gallery View**: Browse generated images with metadata
- **History Management**: Track all generations with searchable history
- **Image Metadata**: Comprehensive EXIF and generation data display
- **Export Options**: Download images with embedded metadata

### 📊 **Monitoring & Debugging**
- **Connection Status**: Real-time ComfyUI server connection monitoring
- **Performance Metrics**: Track generation times and resource usage
- **Error Handling**: Comprehensive error reporting with detailed messages
- **Debug Tools**: WebSocket debugging panel and connection diagnostics

### 🎯 **User Experience**
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Theme**: Modern dark UI optimized for long usage sessions
- **Fast Refresh**: Optimized development experience with Vite HMR
- **Type Safety**: Full TypeScript coverage for reliability

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- ComfyUI server running on `http://192.168.1.15:8188` (or configure endpoint)

### Installation

```bash
# Clone the repository
git clone https://github.com/koshtaru/comfyWeb.git
cd comfyWeb/comfyui-react

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

### ComfyUI Server Connection
The default endpoint is `http://192.168.1.15:8188`. To change this:

1. Update the endpoint in `comfyui-react/src/store/apiStore.ts`
2. Or use the Settings page to configure the API endpoint dynamically

### Environment Variables
Create a `.env` file for custom configuration:

```env
VITE_COMFYUI_ENDPOINT=http://your-comfyui-server:8188
VITE_WEBSOCKET_URL=ws://your-comfyui-server:8188/ws
```

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: React 19.1 + TypeScript + Vite
- **State Management**: Zustand for global state
- **Styling**: TailwindCSS + Custom CSS modules
- **Routing**: React Router v7
- **WebSocket**: Custom service with reconnection logic
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier + Husky

### **Project Structure**
```
comfyui-react/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI components (Button, Input, etc.)
│   │   ├── layout/         # Layout components (Navigation, etc.)
│   │   ├── workflow/       # Workflow-specific components
│   │   ├── parameters/     # Parameter control components
│   │   └── metadata/       # Metadata display components
│   ├── pages/              # Route components
│   ├── store/              # Zustand stores for state management
│   ├── services/           # API and WebSocket services
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── constants/          # Application constants
├── package.json            # Project dependencies and scripts
├── vite.config.ts         # Vite build configuration
└── tsconfig.json          # TypeScript configuration
```

### **Key Services**
- **WebSocket Store**: Real-time communication with ComfyUI
- **Generation Service**: Handles image generation workflows
- **History Manager**: Tracks and persists generation history
- **Preset Service**: Manages parameter presets and configurations

## 🛠️ Development

### **Development Workflow**
```bash
# Start development server with hot reload
npm run dev

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format
```

### **Code Quality**
- **Pre-commit hooks**: Automatic linting and formatting
- **TypeScript strict mode**: Maximum type safety
- **ESLint**: Comprehensive code quality rules
- **Prettier**: Consistent code formatting
- **Vitest**: Fast unit and integration testing

### **Testing Strategy**
- **Unit Tests**: Component logic and utilities
- **Integration Tests**: Component interactions
- **E2E Testing**: Critical user workflows
- **Mock Service Worker**: API mocking for reliable tests

## 🔄 Current Development Cycle

### **Phase 3 Complete ✅**
- ✅ Architecture improvements and Fast Refresh optimization
- ✅ Component export cleanup and module boundaries
- ✅ WebSocket store migration from Context API to Zustand
- ✅ Progress bar display and auto-hide functionality
- ✅ Image generation and display pipeline fixes

### **Active Development Focus**
- **Performance Optimization**: Bundle size reduction and lazy loading
- **Enhanced UX**: Improved error states and loading indicators
- **Mobile Responsiveness**: Touch-optimized interface
- **Advanced Features**: Custom node support and workflow editing

### **Upcoming Features**
- **Workflow Editor**: Visual workflow creation and modification
- **Advanced Queue Management**: Priority queuing and batch processing
- **Plugin System**: Extensible architecture for custom features
- **Cloud Integration**: Remote ComfyUI server management

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests in watch mode |
| `npm run test:ui` | Open Vitest UI |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript compiler check |

## 🐛 Troubleshooting

### Common Issues

**Connection Issues**
- Verify ComfyUI server is running and accessible
- Check WebSocket endpoint configuration
- Review browser network tab for connection errors

**Build Issues**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`
- Verify all dependencies are installed

**Performance Issues**
- Enable React DevTools Profiler
- Check for memory leaks in WebSocket connections
- Monitor bundle size with build analyzer

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commit messages
- Ensure all checks pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - The amazing backend that powers this interface
- [React](https://reactjs.org/) - The frontend framework
- [Vite](https://vitejs.dev/) - The build tool that makes development fast
- [TailwindCSS](https://tailwindcss.com/) - The utility-first CSS framework

---

**Built with ❤️ for the ComfyUI community**