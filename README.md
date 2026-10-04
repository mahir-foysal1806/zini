# Zini — Personal AI Assistant 🤖

Zini is a local AI-powered personal assistant built with **Node.js** and **Ollama**.

The goal of Zini is to become a personal coding and computer assistant that can understand files, analyse code, explain problems, suggest fixes, and safely modify code using a sandbox-based workflow.

## ✨ Current Features

* 💬 Chat with Zini using the terminal
* 🧠 Powered by local AI through Ollama
* 📄 Read and analyse JavaScript files
* 🔍 Explain code in beginner-friendly language
* 🛠️ Detect and suggest fixes for JavaScript code
* 📦 Edit files inside a separate sandbox
* 🧪 Test sandbox code before applying changes
* 📊 Show the difference between original and modified code
* ✅ Ask for user approval before changing the original file
* 💾 Create a backup before applying changes

## 🧰 Tech Stack

* **Node.js**
* **Ollama**
* **Qwen2.5-Coder**
* **JavaScript**
* **Git & GitHub**

## 📋 Requirements

Make sure you have:

* Node.js installed
* Ollama installed and running
* Qwen2.5-Coder model installed

For example:

```bash
ollama pull qwen2.5-coder:3b
```

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/zini.git
```

Go into the project:

```bash
cd zini
```

Install dependencies:

```bash
npm install
```

Start Zini:

```bash
node index.js
```

For development, you can also use:

```bash
node --watch index.js
```

## 💻 How to Use

After starting Zini, you will see:

```text
Zini — Personal AI Assistant

You:
```

You can simply chat with Zini:

```text
You: explain what Node.js is
```

### Explain a File

To ask Zini to explain a JavaScript file:

```text
You: explain src/server.js
```

Zini will read the file and explain what the code does.

### Analyse a File

You can ask Zini to analyse a file:

```text
You: analyse src/server.js
```

Zini can identify possible bugs and problems in the code.

### Test a File

Run a JavaScript file through Zini:

```text
You: test src/server.js
```

### Fix a File

To generate a possible fix:

```text
You: fix src/server.js
```

Zini does **not** immediately overwrite your original file.

Instead, the proposed changes are made inside the sandbox.

### Automatic Fix Workflow

You can use:

```text
You: auto-fix src/server.js
```

The workflow is:

```text
Original File
     │
     ▼
Read & Analyse
     │
     ▼
Create Sandbox
     │
     ▼
Generate Fix
     │
     ▼
Validate JavaScript
     │
     ▼
Test Sandbox
     │
     ▼
Show Diff
     │
     ▼
Ask User for Approval
     │
     ├── No ──► Original remains unchanged
     │
     └── Yes
          │
          ▼
     Create Backup
          │
          ▼
     Apply Changes
```

## 🛡️ Safety

Zini is designed with a **safe editing workflow**.

When Zini generates a code fix, it first works on a copy inside the sandbox.

The original file is not changed until the user explicitly approves the changes.

Before applying an approved change, Zini also creates a backup:

```text
your-file.js.zini-backup
```

This project currently provides **application-level safety**. It is not yet a complete operating-system-level sandbox.

Future versions may use technologies such as **Podman** or **Bubblewrap** for stronger isolation.

## 📁 Project Structure

```text
zini/
├── index.js
├── package.json
├── package-lock.json
├── sandbox/
└── README.md
```

The `sandbox/` directory is used for temporary code modifications and should not be committed to GitHub.

## 🔮 Future Plans

Zini is an ongoing project.

Planned features include:

* 🖥️ System information
* 📁 Better file and folder understanding
* 🔧 More programming language support
* 🧪 Better automated testing
* 🐳 Real OS-level sandboxing
* 💻 Safe shell command execution
* 🗂️ Project-wide code analysis
* 🧠 Better long-term memory
* 🔎 Web search capabilities
* 🎙️ Voice interaction
* 🖱️ Computer interaction
* 🤖 More autonomous agent capabilities

## 🎯 Project Goal

The long-term goal is to build **Zini into a useful local personal AI assistant** that can help with coding, computer tasks, learning, and everyday workflows while keeping the user in control of potentially dangerous actions.

> **AI should assist the user — not silently take control.**

## 👨‍💻 Author

**Mahir Foysal**

Built with Node.js + Ollama + Qwen2.5-Coder.

---

⭐ If you find the project interesting, consider giving it a star!
