# Codeforces Companion Dashboard

![CF Study Archive](https://upload.wikimedia.org/wikipedia/commons/b/b1/Codeforces_logo.svg)

An intelligent, lightweight, and blazing-fast web-based workspace designed to elevate your Codeforces competitive programming training. 

Analyze problem statements, read official solutions side-by-side, and track your Codeforces progress in a beautiful, distraction-free environment with native dark mode support.

## 🚀 Features

- **Blazing Fast Global Caching:** Instant problem and solution fetching (< 20ms response times).
- **Split-Pane Integrated Workspace:** Read problem statements and study C++, Python, and Java accepted solutions side-by-side in a VS Code-like Monaco editor.
- **Auto-Sync History:** Automatically saves your recently viewed problems and contests so you can easily resume training across multiple devices.
- **Starred Solutions:** Bookmark specific elegant solutions to review later.
- **LaTeX Math Rendering:** Native support for Codeforces `$$$` MathJax rendering.
- **Premium UI/UX:** Built with a stunning modern interface featuring glassmorphism, fluid animations, and highly optimized layouts.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS + Vanilla CSS (Glassmorphism & animations)
- **Editor:** Monaco Editor (VS Code core)
- **Routing:** React Router v6
- **State/Caching:** React Query (@tanstack/react-query)
- **Math Rendering:** MathJax 3

### Backend
- **Framework:** FastAPI (Python 3.10)
- **Data Fetching:** Codeforces Official API
- **Caching:** In-memory async caching
- **Database:** Supabase (PostgreSQL) for user authentication and history sync.

---

## 💻 Local Development Setup

To run this project locally on your machine:

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.9+)
- **Supabase Account** (For Auth and Database)

### 2. Set Up Supabase
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **Authentication -> Providers** and enable Email and/or Google.
3. Run the SQL schema provided in `supabase_schema.sql` in your Supabase SQL editor to create the `user_history` and `user_problem_states` tables.

### 3. Backend Setup
Navigate to the `backend` directory, create a virtual environment, and start the FastAPI server:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*The backend API will run at http://localhost:8000*

### 4. Frontend Setup
Navigate to the `frontend` directory, install dependencies, and start the Vite dev server:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the app:
```bash
npm run dev
```
*The React app will run at http://localhost:5173*

---

## ☁️ Deployment Instructions (Render)

This repository includes a `render.yaml` Blueprint to make deployment on Render 100% automated!

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect this GitHub repository.
4. Render will automatically detect the `render.yaml` file and configure both the backend (Web Service) and frontend (Static Site).
5. **Important**: When prompted by Render, fill in your Supabase environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**! 

*Render handles automatically passing the backend URL to the frontend during the build step.*

---

## 📝 License
This project is open-source and available under the MIT License.
