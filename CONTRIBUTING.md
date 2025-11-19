# Contributing to PaperMirror

First off, thanks for taking the time to contribute! 🎉

PaperMirror is an open-source project, and we love to receive contributions from our community — you! There are many ways to contribute, from writing tutorials or blog posts, improving the documentation, submitting bug reports and feature requests, or writing code which can be incorporated into the project.

## 🛠 Local Development

PaperMirror is a Client-Side React application built with Vite.

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/paper-mirror.git
    cd paper-mirror
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Set up Environment Variables**:
    Copy `.env.example` to `.env` and add your Google Gemini API Key (optional for UI work, required for functional testing).
    ```bash
    cp .env.example .env
    ```
5.  **Start the dev server**:
    ```bash
    npm run dev
    ```
6.  **Open your browser** at `http://localhost:5173`.

## 🐛 Reporting Bugs

A bug is a demonstrable problem that is caused by the code in the repository. Good bug reports are extremely helpful, so thanks!

1.  **Use the GitHub Issues search** — check if the issue has already been reported.
2.  **Check if the issue has been fixed** — try to reproduce it using the latest `main` branch in the repository.
3.  **Isolate the problem** — ideally create a reduced test case.

## 💡 Pull Requests

Good pull requests—patches, improvements, new features—are a fantastic help. They should remain focused in scope and avoid containing unrelated commits.

1.  **Branch out**: Create a new branch for your feature (`git checkout -b feature/amazing-feature`).
2.  **Commit**: Make sure your commit messages are clear.
3.  **Push**: Push to your fork (`git push origin feature/amazing-feature`).
4.  **PR**: Open a Pull Request against the `main` branch.

## 🧩 Architecture Note

Please remember **PaperMirror is a Client-Side Only application**.
- Do not introduce backend servers (Express, Python, etc.).
- Do not add proxies that introduce latency.
- Ensure all new dependencies are compatible with browser environments.

Thank you for contributing!