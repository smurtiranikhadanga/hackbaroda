# AI Incident Response Agent — Features & UI Specification

This document lists all 12 key SRE intelligence and chatbot features built into the platform, along with the custom UI layouts based on the hand-drawn sketches.

---

## 🎨 UI & Layout Specifications (Based on Sketches)

### 1. Left Sidebar Navigation
- **Search Incident**: Toggle modes between **Agent Search** (advanced telemetry and query matching) and **User Search** (simplified troubleshooting guidelines).
- **Add Incident**: Form containing fields for `Incident Title`, `Symptoms` (description, error messages, timeline, metrics), and `Assigned Engineer`. Initiates automatic SRE pipeline analysis via the **Analyze Incident >** button.
- **CHAT [NEW]**: Opens the conversational assistant.
- **History**: Droplist providing direct access to:
  - **Incident Timeline** (resolution time tracking).
  - **Postmortems** (PDF report file downloads).
  - **Group Similar Problems** (incident clustering view).
- **Notification**: Live notification count bubble indicating unresolved critical issues.
- **Get Detailed**: Renders a dropdown to **Select Incident** (e.g., *Website Down*, *Auth API timeouts*, *Database Connection*). On selection, displays a complete analysis dashboard:
  - Incident severity and status.
  - Root cause analysis & timeline.
  - Estimated resolution time.
  - Multi-solution ranked fixes.
  - Prevention alerts.
  - Industry outage references (Netflix, AWS, Cloudflare).
- **Settings & Profile**: Anchored at the bottom left of the sidebar.

### 2. Header and Main Panel
- Centered header displaying **Dashboard**.
- Top-right **Login** button which opens an optional authentication panel:
  - Supports toggling between **User** and **Admin** modes.
  - **Login**: Email, Password, Remember Me, Forget Password link, Sign Up link.
  - *Note: Login is completely optional. Users can run and browse all features as a guest without signing in.*
  - **Create Account**: Name, Email, Password, Confirm Password.
  - **Forget Password**: Email lookup to reset.
- Bottom-anchored **Global Chat Input Bar** `( Chat, ... +)`: Accessible from any tab to immediately chat with the agent.

---

## 🚀 The 12 Key SRE Features

### 1. AI Incident Analysis
- Parses raw symptoms (e.g., *"Users getting 503 errors, website not loading"*) to automatically identify:
  - **Severity** (Low, Medium, High, Critical).
  - **Possible Causes** with confidence percentages.
  - **Affected Services** list.
  - **Recommended Actions** pipeline.

### 2. Similar Incident Memory
- Leverages local vector memory search (with pure-Python fallback for quick setups) to compare current symptoms with historical cases and display matching incidents side-by-side (e.g., Incident #21 resolved by Restarting Pool).

### 3. Self-Learning Engine
- As soon as an incident is resolved with an actual cause and fix, it is embedded and saved in the memory database. The system automatically learns from this resolution to refine future recommendations.

### 4. User Impact Analyzer
- Evaluates the scale of the issue:
  - **Active Users** vs **Affected Users** (e.g., 4200 out of 5000 affected -> 84% impact).
  - **Business Impact Badges**: *Revenue Risk* (Low, Medium, High) and *Service Availability* (Critical, Degraded, Normal).

### 5. Incident Timeline Generator
- Displays a step-by-step audit log:
  - `Alert Triggered` -> `AI Analysis Started` -> `Similar Incidents Found` -> `Resolution Applied` -> `Service Restored`.

### 6. Resolution Time Prediction
- AI estimates the minutes required to resolve the incident based on historical database, cache, or network outages.

### 7. Ranked Fix Recommendation System
- Instead of showing a single recovery path, the system ranks multiple solutions based on historical success rates (e.g., 1. Restart Pool - 92%, 2. Scale Database - 83%).

### 8. Prevention Recommendation Engine
- Analyzes recurrence frequency (e.g., *"This incident occurred 4 times in 30 days"*) and suggests proactive fixes (e.g., `"Add Database Monitoring"`, `"Configure Alert Thresholds"`).

### 9. Cross-Company Learning
- AI extracts outage logs and recovery patterns from industry leaders (Netflix, Cloudflare, GitHub, AWS) and recommends their design principles for resolving the incident.

### 10. Automatic Incident Clustering
- Automatically clusters duplicate incident reports (e.g., *"Website Slow"*, *"Login Timeout"*) under a unified cluster identifier (e.g., `"Database Performance Issue"`).

### 11. AI Support Agent (Self-Help Troubleshooting)
- Direct self-help conversation for:
  - **Password Issues**: Guided checks for session expiry, caching, SSO lock.
  - **Website Not Opening**: Steps for DNS ping, internet diagnostics, browser cache.

### 12. Conversational Chat Interface
- Rich chat interaction supporting symptom reporting, user impact clarification, and instant recovery suggestions.
