# Sahayak AI 
### Intelligent Volunteer Coordination for Social Impact

Sahayak AI bridges the gap between communities in crisis, NGO coordinators, and volunteers — powered by Google Gemini AI and Firebase. Built for Google Solution Challenge 2026.

---

##  Live App
 **https://sahayak-ai-155fd.web.app**

---

##  Problem Statement
In times of crisis, communities lack a structured way to report needs, and NGOs struggle to coordinate volunteers efficiently. Manual coordination leads to delayed responses, mismatched volunteer skills, and zero visibility into real-world impact.

---

##  Solution
A role-based platform where:
-  **Community Members** report needs from the ground
-  **NGO Coordinators** manage needs and assign volunteers using AI
-  **Volunteers** receive tasks, submit proof, and get feedback

---

##  How Google Gemini AI Is Used

**1. Priority Scoring**
Every submitted need is analyzed by Gemini AI and assigned a score from 1-10 with an urgency label — Critical / High / Medium / Low — and an explanation.

**2. Volunteer Matching**
When an NGO assigns a volunteer, Gemini scans all volunteer profiles and ranks them by compatibility — skills, location, and availability — with reasoning for each match.

---

##  Features

**Community Members**
- Submit needs with AI priority scoring
- Edit or delete own submissions
- Track status in real time
- Personal impact tracker

**NGO Coordinator**
- Dashboard with needs sorted by AI urgency score
- Multi-select filters by status and urgency
- AI volunteer matching with ranked results
- Approve or reject completed tasks with written reason
- Real-time notifications

**Volunteers**
- View assigned tasks with full details
- Submit completion note and optional photo proof
- Real-time notifications when assigned
- Receive rejection reason if task needs to be redone

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js |
| Authentication | Firebase Auth |
| Database | Firebase Firestore |
| AI | Google Gemini API |
| Image Upload | Cloudinary |
| Hosting | Firebase Hosting |
| Version Control | GitHub |

---

##  Run Locally

**Prerequisites:** Node.js installed

```bash
git clone https://github.com/[your-github-username]/sahayak-ai.git
cd sahayak-ai
npm install
```

Create a `.env` file in the root directory:
```
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_GEMINI_API_KEY=your_gemini_key
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_preset
```

```bash
npm start
```

---

## 🧪 Test Accounts

| Role | Email | Password |
|------|-------|---------|
| NGO | *(contact team)* | *(contact team)* |
| Community | *(contact team)* | *(contact team)* |
| Volunteer | *(contact team)* | *(contact team)* |
| Volunteer | *(contact team)* | *(contact team)* |
| Volunteer | *(contact team)* | *(contact team)* |

---

##  Current Limitations
- This prototype supports a **single NGO** instance
- All community members and volunteers are coordinated under one NGO

---

##  Future Development
- Multi-NGO support
- PWA — installable web app
- Impact analytics dashboard
- Multilingual support (Kannada, Hindi)
- Location-based volunteer matching

---

## 👩‍💻 Team Shreksha
Google Solution Challenge 2026
