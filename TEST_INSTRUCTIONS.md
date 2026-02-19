# Quick Test Instructions

The Vite dev server is running at **http://localhost:5173**

## How to Test:

1. **Open your browser** (Chrome, Edge, or Firefox)
2. **Navigate to:** `http://localhost:5173`
3. You should see the **FlowBoard Login page**

## What You Should See:


✅ A modern glassmorphic login card with cyan/teal gradient  
✅ FlowBoard logo at the top  
✅ Sign In / Sign Up buttons  
✅ Email and password input fields  

## If You See Errors:

1. **Press F12** to open developer console
2. Check the **Console tab** for JavaScript errors
3. Check the **Network tab** for failed requests
4. **Take a screenshot** or copy the error message

## Test Steps:

### 1. Register a New Account
- Click "Sign Up"
- Enter: First Name, Last Name, Email, Password
- Click "Create Account"
- You should be redirected to the Dashboard

### 2. View Dashboard
- You should see:
  - Stats cards (Projects, Tasks, Completion %, Overdue)
  - "Your Projects" section
  - "New Project" button

### 3. Create a Project
- Click "New Project"
- Enter project name and description
- Choose a color
- Click "Create Project"

### 4. View Project
- Click on a project card
- You should see the Kanban board with 4 columns:
  - To Do
  - In Progress
  - Review
  - Done

### 5. Test Real-time Features
- Open the app in **two different browser windows**
- Create a task in one window
- It should appear in the other window (real-time Socket.IO)

---

## Common Issues:

### ERR_CONNECTION_REFUSED
- Make sure Vite server is running: `cd frontend && npm run dev`
- Check that it says "Local: http://localhost:5173/"

### Blank white page
- Check browser console for errors (F12)
- Look for import errors or missing components

### Blue screen / 404
- Make sure you're using `http://localhost:5173` (not `http://localhost`)
- Check the URL is exactly correct

---

**The server IS running now!** Just open http://localhost:5173 in your browser 🚀
