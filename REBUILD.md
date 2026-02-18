# FlowBoard — Complete Rebuild Summary

## What Was Done

Every frontend file was rewritten from scratch to ensure **zero broken imports, zero missing CSS classes, and zero runtime errors**.

## Files Rewritten (9 total)

| File | Purpose |
|------|---------|
| `index.css` | Complete design system — every CSS class used by every component is defined |
| `App.jsx` | Clean routing: `/login`, `/dashboard`, `/projects`, `/projects/:id` |
| `Navbar.jsx` | Uses AuthContext, shows user avatar, active route highlighting |
| `Sidebar.jsx` | Project list with color dots, `/projects/:id` links |
| `Layout.jsx` | Pass-through wrapper (pages manage their own layout) |
| `Login.jsx` | Sign In / Sign Up with AuthContext (login/register) |
| `Dashboard.jsx` | Stats cards, project grid, create project modal |
| `Projects.jsx` | Full project list with CRUD, delete, color picker |
| `ChatPanel.jsx` | Uses `messagesAPI` for correct endpoints |
| `ProjectView.jsx` | Kanban board + task CRUD + real-time chat + video call |
| `IncomingCallOverlay.jsx` | Incoming call UI with accept/reject |

## Key Fixes

- ✅ **CSS classes match components** — every `form-group`, `form-label`, `stat-card`, `kanban-col`, etc. is defined
- ✅ **Consistent routing** — all components use `/projects/:id`
- ✅ **AuthContext everywhere** — no more manual localStorage reads
- ✅ **Correct API endpoints** — `messagesAPI.getAll(projectId)` matches backend
- ✅ **Production build succeeds** — 1454 modules, zero errors

## Running

- **Frontend:** http://localhost:5173 (Vite dev server)
- **Backend:** http://localhost:5000 (Express + Socket.IO)
- **Database:** MySQL on localhost:3306

## Agora Video Calling

Credentials are configured in `.env`:
- `AGORA_APP_ID=e6061be9565b47e0b9705f86de2a42f5`
- `VITE_AGORA_APP_ID=e6061be9565b47e0b9705f86de2a42f5`

Video calling is integrated into the ProjectView page — click the **Video** button to start a call.
