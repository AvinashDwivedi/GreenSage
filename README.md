# 🌱 GreenSage – VS Code Extension for Sustainable Coding

GreenSage is a **Visual Studio Code extension** that helps developers write **energy-efficient, carbon-aware, and sustainable code** by following the principles of the [Green Software Foundation](https://greensoftware.foundation/).  

It analyzes selected portions of your code and suggests improvements that reduce **energy consumption, carbon emissions, and hardware waste**, while still maintaining correctness and performance.  

---

## ✨ Features

- 🔍 **Selective Code Analysis** – Highlight code in your editor and click *Analyze Selected Code* to receive green suggestions.  
- ⚡ **Intelligent Improvements** – Suggestions are generated using AI, guided by the **Green Software Foundation’s Software Carbon Intensity (SCI)** framework.  
- 🎨 **Theme Aware UI** – The results panel matches your VS Code theme (dark/light).  
- ♻️ **Replace with One Click** – Apply suggested code changes directly in your file with a **Replace in Editor** button.  
- 📊 **GSF-Aligned Guidance** – Recommendations follow **energy efficiency**, **carbon awareness**, and **hardware efficiency** principles.  

---

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/greensage.git
   cd greensage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Open the project in **VS Code**:
   ```bash
   code .
   ```

5. Press `F5` to run the extension in a new **Extension Development Host** window.

---

## ⚙️ Configuration

GreenSage requires an **OpenAI API key** to generate intelligent suggestions.

1. Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. Restart VS Code after setting up the environment file.

---

## 🚀 Usage

1. Select any portion of code in your editor.  
2. Right-click and choose **Analyze Selected Code**, or run the command via the Command Palette (`Ctrl+Shift+P` → "GreenSage: Analyze Selected Code").  
3. The **right-hand panel** will show:
   - 🌱 **Reasoning** – Why the code can be improved  
   - 🧾 **Original Code** – The code you selected  
   - ✅ **Suggested Code** – The optimized version  
4. Click **Replace in Editor** to apply the changes directly.  

---

## 📖 Example

**Original Code:**
```python
data = []
for i in range(1000000):
    data.append(i * 2)
```

**Suggested Code:**
```python
data = [i * 2 for i in range(1_000_000)]
```

**Reason:**
- Uses list comprehension, which is more **memory-efficient** and reduces **CPU cycles**, aligning with **GSF’s energy efficiency guidelines**.

---

## 🌍 Alignment with Green Software Foundation

GreenSage aligns with the [Green Software Foundation (GSF)](https://greensoftware.foundation/) principles:  

- **Energy Efficiency** – Optimize algorithms and data structures to reduce energy consumption.  
- **Carbon Awareness** – Favor operations that minimize carbon intensity when possible.  
- **Hardware Efficiency** – Reduce resource waste by using efficient patterns.  
- **SCI Framework** – Encourages measurable improvements using Software Carbon Intensity `(E × I) + M per R`.  

---

## 🛠 Development

- **Language**: TypeScript  
- **Framework**: VS Code Extension API  
- **AI Backend**: OpenAI GPT models  

### Build
```bash
npm run compile
```

### Run
Press `F5` in VS Code to open the extension in dev mode.  

---

## 🤝 Contributing

Contributions are welcome!  
If you’d like to add new features, improve GSF-aligned checks, or enhance UI/UX, feel free to fork the repo and submit a PR.

---

## 📜 License

MIT License © 2025 – SkolarAi

---

🔋 *GreenSage – making code sustainable, one refactor at a time.* 🌱
