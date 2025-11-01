# Portfolio Backend API

A production-grade portfolio backend API built with Express.js, TypeScript, Prisma, Redis, and Better-Auth.

## 🚀 Features

- **Authentication**: Secure JWT-based authentication with Better-Auth
- **Projects Management**: Full CRUD for portfolio projects
- **Blog System**: Markdown-based blog with slug generation and analytics
- **Contact Form**: Rate-limited contact submissions with email notifications
- **Skills Management**: Categorized skills with icons
- **Analytics**: Track views and generate insights
- **File Uploads**: Cloudinary integration for images
- **Caching**: Redis caching for optimal performance
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Type Safety**: Full TypeScript coverage
- **Testing**: Jest + Supertest for comprehensive testing

## 📋 Prerequisites

- Node.js >= 18
- PostgreSQL >= 13
- Redis >= 6
- pnpm >= 8

## 🛠️ Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd portfolio-backend
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration values.

4. Set up the database:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

5. Start the development server:

```bash
pnpm dev
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Once the server is running, visit:

- Swagger UI: `http://localhost:5000/api/docs`
- OpenAPI JSON: `http://localhost:5000/api/openapi.json`

## 🗂️ Project Structure

```
src/
├── api/
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Custom middleware
│   ├── routes/          # Route definitions
│   └── validators/      # Zod schemas
├── config/              # Configuration files
├── db/                  # Database clients
├── services/            # Business logic
├── types/               # TypeScript types
└── utils/               # Helper functions
```

## 🔐 Authentication

### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@portfolio.com",
  "password": "admin123456"
}
```

### Use Token

```bash
Authorization: Bearer <your-token>
```

## 📝 Example Requests

### Create Project (Admin)

```bash
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: multipart/form-data

title: My Project
description: Project description
tags: ["React", "TypeScript"]
stack: ["React", "Node.js"]
featured: true
image: <file>
```

### Submit Contact Form

```bash
POST /api/v1/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I'd like to connect!"
}
```

### Get Blog Posts

```bash
GET /api/v1/blogs?page=1&limit=10&published=true
```

## 🧪 Testing

Run tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Generate coverage report:

```bash
pnpm test -- --coverage
```

## 🐳 Docker Deployment

Build the image:

```bash
docker build -t portfolio-backend .
```

Run the container:

```bash
docker run -p 5000:5000 --env-file .env portfolio-backend
```

## 🚀 Deployment

### Railway

1. Install Railway CLI:

```bash
npm install -g @railway/cli
```

2. Login and deploy:

```bash
railway login
railway init
railway up
```

3. Add environment variables in Railway dashboard

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `pnpm install && pnpm build && pnpm prisma:migrate:prod`
4. Set start command: `pnpm start`
5. Add environment variables

## 📦 Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm lint` - Lint code
- `pnpm format` - Format code with Prettier
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run migrations
- `pnpm prisma:seed` - Seed database
- `pnpm prisma:studio` - Open Prisma Studio

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options.

### Rate Limiting

- Global: 100 requests per 15 minutes
- Contact form: 3 submissions per hour

### Caching

- Project list: 10 minutes
- Blog list: 10 minutes
- Skills: 30 minutes
- Analytics: 5 minutes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT

## 👨‍💻 Default Admin Credentials

**Email**: admin@portfolio.com  
**Password**: admin123456

**⚠️ Change these in production!**
