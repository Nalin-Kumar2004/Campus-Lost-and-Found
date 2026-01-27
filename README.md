# 🎓 Campus Lost & Found

A full-stack web application designed to help students and staff efficiently report, search, and claim lost items on campus. Built with modern technologies for a seamless and secure experience.

---

## ✨ Features

### For Users
- 🔐 **Secure Authentication** - JWT-based auth with refresh tokens & email verification
- 📝 **Post Lost/Found Items** - Upload images, provide detailed descriptions, and categorize items
- 🔍 **Advanced Search & Filter** - Search by category, location, date range, and keywords
- 📋 **Claims Management** - Submit claims with verification details
- 📧 **Email Notifications** - Get notified when someone claims your item or when your claim is reviewed
- 👤 **User Dashboard** - Track your posted items and submitted claims

### For Admins
- 🛡️ **Admin Panel** - Manage all items, users, and claims
- 📊 **Statistics Dashboard** - Monitor platform activity and analytics
- ✅ **Moderation Tools** - Approve or reject items and claims
- 🔒 **Role-Based Access Control** - Secure admin-only operations

---

---

## �🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **TailwindCSS** for modern, responsive UI
- **Zustand** for state management
- **React Router** for navigation
- **Axios** for API requests

### Backend
- **Node.js** with Express & TypeScript
- **Prisma ORM** with PostgreSQL database
- **JWT** for authentication (access + refresh tokens)
- **Nodemailer** for email notifications
- **Cloudinary** for image storage and management
- **Helmet.js** for security headers
- **Rate Limiting** to prevent abuse

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database (local or cloud)
- Cloudinary account (free tier works)
- Gmail account with App Password (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nalin-Kumar2004/campus-lost-and-found.git
   cd campus-lost-and-found
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy and configure environment variables
   cp .env.example .env
   # Edit .env with your database URL, JWT secret, Cloudinary, and email credentials
   
   # Generate Prisma client and run migrations
   npm run prisma:generate
   npm run prisma:migrate
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   
   # Copy and configure environment variables (if needed)
   cp .env.example .env
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

---

## 📁 Project Structure

```
campus-lost-and-found/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── utils/           # Helpers (email, cloudinary, jwt)
│   │   └── server.ts        # Express app entry
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── services/        # API calls
│   │   ├── store/           # Zustand state
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   └── package.json
└── README.md
```

---

## 🔒 Security Features

- ✅ JWT authentication with short-lived access tokens (15 min)
- ✅ Refresh tokens stored in httpOnly cookies
- ✅ Password hashing with bcrypt
- ✅ Email verification for new accounts
- ✅ Rate limiting on API endpoints
- ✅ Secure HTTP headers (Helmet.js)
- ✅ Input validation and sanitization
- ✅ CORS configured for specific origins
- ✅ Environment variable validation

---

## 📧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Campus Lost & Found <your-email@gmail.com>"

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (.env) - Optional
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📜 Available Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Nalin Kumar**
- GitHub: [@Nalin-Kumar2004](https://github.com/Nalin-Kumar2004)
- LinkedIn: [nalin-kumar-swe](https://www.linkedin.com/in/nalin-kumar-swe)

---

## 🙏 Acknowledgments

- Icons from [Heroicons](https://heroicons.com/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Image hosting by [Cloudinary](https://cloudinary.com/)

---

**Made for making campus life easier** 🎓✨
