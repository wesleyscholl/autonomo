# 🚀 Quick Start Guide

Welcome to **Autonomo** - The Living App! This guide will get you up and running in minutes.

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - For evolution tracking
- **Gemini API Key** - [Get it here](https://makersuite.google.com/app/apikey)

## ⚡ Installation

### 1. Clone and Install

```bash
git clone <your-repo-url> autonomo
cd autonomo
npm install
```

### 2. Configure API Key

```bash
cp .env.example .env
```

Edit `.env` with your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Start Autonomo

```bash
npm start
```

You should see:
```
🧠 AUTONOMO - LIVING APP
🚀 Server running on http://localhost:3000
🤖 AI Agents: planner, coder, executor, reflector
⚡ Features loaded: 2
🔒 Safety mode: ENABLED
```

## 🎯 First Evolution

### Option 1: Web Interface

1. Open http://localhost:3000/health
2. Use POST http://localhost:3000/evolve with:

```json
{
  "request": "Create a URL shortener service",
  "mode": "guided"
}
```

### Option 2: Command Line

```bash
npm run evolve -- --request "Add a password generator" --mode guided
```

### Option 3: Interactive Mode

```bash
node index.js evolve
# Follow the prompts
```

## 📊 Monitor Evolution

### Check System Status
```bash
npm run status
```

### View Active Features
```bash
curl http://localhost:3000/features
```

### Check Evolution History
```bash
curl http://localhost:3000/agents/status
```

## 🧪 Example API Calls

### Get Random Quote
```bash
curl http://localhost:3000/api/quotes
```

### Get Weather (Mock)
```bash
curl -X POST http://localhost:3000/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city": "Tokyo"}'
```

### Trigger Evolution
```bash
curl -X POST http://localhost:3000/evolve \
  -H "Content-Type: application/json" \
  -d '{"request": "Build a joke API", "mode": "guided"}'
```

## 🛠️ Useful Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the living app |
| `npm run dev` | Start with auto-reload |
| `npm run status` | Show system status |
| `npm run evolve` | Manual evolution |
| `node tools/reset.js` | Reset system state |
| `node tools/backup.js` | Create backup |

## 🔧 Troubleshooting

### Common Issues

**1. API Key Errors**
```bash
# Check if key is loaded
node -e "require('dotenv').config(); console.log(!!process.env.GEMINI_API_KEY)"
```

**2. Port Already in Use**
```bash
# Use different port
PORT=3001 npm start
```

**3. Permission Errors**
```bash
# Fix permissions
chmod +x tools/*.js
```

### Debug Mode

```bash
LOG_LEVEL=debug npm start
```

## 🚀 What's Next?

1. **Watch it evolve** - Request new features and see them appear
2. **Check the `/dynamic` folder** - See generated code
3. **Explore `/logs`** - View evolution history
4. **Try autonomous mode** - `ENABLE_AUTONOMOUS_EVOLUTION=true npm start`

## 💡 Feature Ideas to Try

- "Create a unit converter API"
- "Add a QR code generator"
- "Build a simple todo list"
- "Make a hash calculator"
- "Create a color palette generator"

## 🆘 Need Help?

- Check `logs/evolution.log` for detailed logs
- Run `npm run status` for system health
- Use `node tools/reset.js` to start fresh
- View the full README.md for architecture details
- Get Gemini API key at https://makersuite.google.com/app/apikey

---

**Ready to watch your app evolve? 🧬**

```bash
npm start
# Then visit http://localhost:3000/health
```