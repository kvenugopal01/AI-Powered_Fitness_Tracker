# 🏋️ BFit – AI Powered Fitness Assistant

BFit is an AI-powered fitness assistant application that helps users manage fitness activities using AI recommendations, Google authentication, and personalized health features.

---

## 🚀 Features

- User Authentication (Google Login)
- AI Fitness Recommendations
- Workout Planning
- Responsive UI
- Angular Frontend
- Node.js + Express Backend
- MongoDB Database
- Gemini AI Integration

---

## 🛠️ Tech Stack

### Frontend
- Angular
- TypeScript
- HTML
- CSS

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### AI
- Google Gemini API

### Authentication
- Google OAuth

---

# 📂 Project Structure

BFIT-AI-POWERED-FITNESS-ASSISTANT

├── backend  
│ ├── config  
│ ├── middleware  
│ ├── models  
│ ├── routes  
│ ├── server.js  
│ └── .env  

├── frontend  
│ ├── src  
│ ├── public  
│ ├── angular.json  
│ └── package.json  

└── README.md

---

# ⚙️ Installation

## Clone Repository

```bash
git clone <repository-url>
cd bfit-ai-powered-fitness-assistant
```

---

## Install Backend

```bash
cd backend
npm install
```

---

## Install Frontend

```bash
cd ../frontend
npm install
```

---

# 🔐 Environment Variables

Create `.env`

```env
MONGODB_URI=mongodb://localhost:27017/bfit

GEMINI_API_KEY=your_gemini_api_key

JWT_SECRET=your_secret_key

GOOGLE_CLIENT_ID=your_google_client_id

ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
```

---

# ▶️ Run Project

## Start MongoDB

```bash
brew services start mongodb-community
```

---

## Start Backend

```bash
cd backend
npm run dev
```

Backend:

```
http://localhost:3000
```

---

## Start Frontend

```bash
cd frontend
npm start
```

or

```bash
ng serve
```

Frontend:

```
http://localhost:4200
```

---

# 🔑 Google OAuth Setup

1. Open Google Cloud Console
2. APIs & Services
3. Credentials
4. Create OAuth Client ID
5. Copy Client ID
6. Add to `.env`

Example:

```env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

---

# 🧪 Testing

Backend:

```bash
npm test
```

Frontend:

```bash
ng test
```

---

# 👨‍💻 Author

Developed by **K.venu gopal**

---

# 📜 License

This project is developed for educational and learning purposes.
