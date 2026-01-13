
# NetPulse: Local Implementation Guide

To run NetPulse on your PC, follow these 3 simple steps.

## 🏃‍♂️ Quick Start (3 Minutes)

### 1. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Start the Unified Server
This command starts both the MikroTik Bridge and hosts the Website:
```bash
node server.js
```

### 3. Open the App
Go to your browser and visit:
**[http://localhost:5000](http://localhost:5000)**

---

## 🔑 Adding your Gemini API Key
To see AI insights (Network Overview), you need to add your API Key. You can do this in two ways:

1.  **Via URL (easiest)**: Open `http://localhost:5000?apiKey=YOUR_GEMINI_KEY`
2.  **Via LocalStorage**: Open the console (F12) in the app and type:
    `localStorage.setItem('GEMINI_API_KEY', 'your-key-here')` then refresh.

---

## 📡 Connecting a Real MikroTik
1. Go to the **MikroTik Nodes** tab in the sidebar.
2. Click **Provision Node**.
3. Copy the script provided and paste it into your MikroTik **Terminal**.
4. Once configured, NetPulse will be able to add/remove users automatically from your actual hardware.

---

## 🛠 Troubleshooting
- **Port 5000 in use**: If you see an error saying "address already in use", check if another program (or an old version of the server) is running.
- **Bridge Offline**: Make sure you ran `node server.js`. If you are using a different dev server (like Vite or Live Server), the bridge will not be connected unless you also run `node server.js` in the background.
