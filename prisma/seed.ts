import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@portfolio.com' },
    update: {},
    create: {
      email: 'admin@portfolio.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Sample projects with slugs
  const projects = [
    {
      title: 'E-Commerce Platform',
      slug: 'ecommerce-platform',
      description: 'A full-stack e-commerce solution with React, Node.js, and PostgreSQL',
      tags: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
      stack: ['React', 'TypeScript', 'Express', 'Prisma', 'PostgreSQL'],
      featured: true,
      order: 1,
      githubUrl: 'https://github.com/example/ecommerce',
      liveUrl: 'https://ecommerce-demo.com',
    },
    {
      title: 'Task Management App',
      slug: 'task-management-app',
      description: 'Collaborative task management application with real-time updates',
      tags: ['Next.js', 'Socket.io', 'MongoDB'],
      stack: ['Next.js', 'TypeScript', 'Socket.io', 'MongoDB', 'TailwindCSS'],
      featured: true,
      order: 2,
      githubUrl: 'https://github.com/example/taskapp',
      liveUrl: 'https://taskapp-demo.com',
    },
    {
      title: 'AI Image Generator',
      slug: 'ai-image-generator',
      description: 'Image generation app using OpenAI DALL-E API',
      tags: ['React', 'OpenAI', 'Node.js'],
      stack: ['React', 'Node.js', 'OpenAI API', 'Cloudinary'],
      featured: false,
      order: 3,
      githubUrl: 'https://github.com/example/ai-images',
    },
    {
      title: 'Real-Time Chat Application',
      slug: 'real-time-chat-application',
      description: 'A modern chat application with end-to-end encryption and real-time messaging',
      tags: ['WebSocket', 'React', 'Node.js', 'Redis'],
      stack: ['React', 'Socket.io', 'Express', 'Redis', 'MongoDB'],
      featured: false,
      order: 4,
      githubUrl: 'https://github.com/example/chat-app',
      liveUrl: 'https://chat-app-demo.com',
    },
    {
      title: 'Portfolio Website Builder',
      slug: 'portfolio-website-builder',
      description: 'Drag-and-drop portfolio builder with customizable templates',
      tags: ['Next.js', 'TailwindCSS', 'DnD'],
      stack: ['Next.js', 'TypeScript', 'TailwindCSS', 'DnD Kit'],
      featured: true,
      order: 5,
      githubUrl: 'https://github.com/example/portfolio-builder',
    },
    {
      title: 'Weather Forecast Dashboard',
      slug: 'weather-forecast-dashboard',
      description: 'Interactive weather dashboard with 7-day forecasts and real-time alerts',
      tags: ['React', 'API Integration', 'Charts'],
      stack: ['React', 'TypeScript', 'Recharts', 'OpenWeather API'],
      featured: false,
      order: 6,
      githubUrl: 'https://github.com/example/weather-dashboard',
      liveUrl: 'https://weather-demo.com',
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {},
      create: project,
    });
  }
  console.log('✅ Projects created');

  // Sample Blogs with slugs and readTime
  const blogs = [
    {
      title: 'Getting Started with TypeScript',
      slug: 'getting-started-with-typescript',
      content: `# Getting Started with TypeScript

TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds optional types, classes, and modules to JavaScript, making it easier to write and maintain large-scale applications.

## Why TypeScript?

TypeScript offers several advantages over plain JavaScript:
- **Type Safety**: Catch errors at compile time instead of runtime
- **Better IDE Support**: Enhanced autocomplete and refactoring
- **Improved Code Quality**: Self-documenting code with type annotations
- **Easier Refactoring**: Confidence when making changes

## Basic Types

TypeScript includes several basic types that you'll use frequently:

\`\`\`typescript
let isDone: boolean = false;
let decimal: number = 6;
let color: string = "blue";
let list: number[] = [1, 2, 3];
\`\`\`

Start using TypeScript today and experience the benefits of type-safe JavaScript development!`,
      excerpt: 'Learn the basics of TypeScript and why you should use it in your next project',
      tags: ['TypeScript', 'JavaScript', 'Programming'],
      published: true,
      publishedAt: new Date(),
      readTime: 5,
    },
    {
      title: 'Building REST APIs with Express and Prisma',
      slug: 'building-rest-apis-with-express-and-prisma',
      content: `# Building REST APIs with Express and Prisma

Learn how to build production-ready REST APIs using Express.js and Prisma ORM. This guide covers everything from setup to deployment.

## Setting Up Your Project

First, initialize your Node.js project and install dependencies:

\`\`\`bash
npm init -y
npm install express prisma @prisma/client
npm install -D typescript @types/express @types/node
\`\`\`

## Database Schema

Define your database schema using Prisma:

\`\`\`prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
\`\`\`

## Creating Your First Endpoint

Here's a basic Express route with Prisma:

\`\`\`typescript
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
\`\`\`

With Express and Prisma, you can build scalable APIs quickly and efficiently!`,
      excerpt: 'A comprehensive guide to building REST APIs with modern tools',
      tags: ['Express', 'Prisma', 'Node.js', 'API'],
      published: true,
      publishedAt: new Date(),
      readTime: 8,
    },
    {
      title: 'Understanding React Hooks',
      slug: 'understanding-react-hooks',
      content: `# Understanding React Hooks

Hooks let you use state and lifecycle features in functional components. They were introduced in React 16.8 and have revolutionized how we write React applications.

## The Most Common Hooks

### useState
Manage state in functional components:

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

### useEffect
Perform side effects in your components:

\`\`\`javascript
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

### useContext
Access context values without prop drilling:

\`\`\`javascript
const theme = useContext(ThemeContext);
\`\`\`

Master these hooks and write cleaner, more maintainable React code!`,
      excerpt: 'Master React Hooks for building modern functional components',
      tags: ['React', 'JavaScript', 'Frontend'],
      published: false,
      readTime: 6,
    },
    {
      title: 'Mastering CSS Grid Layout',
      slug: 'mastering-css-grid-layout',
      content: `# Mastering CSS Grid Layout

CSS Grid is a powerful layout system that makes it easy to create complex, responsive layouts. Learn how to use it effectively in your projects.

## Grid Basics

Create a grid container:

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
\`\`\`

## Responsive Grids

Use auto-fit and minmax for responsive layouts:

\`\`\`css
.container {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
\`\`\`

CSS Grid makes responsive layouts easier than ever before!`,
      excerpt: 'Learn how to create powerful layouts with CSS Grid',
      tags: ['CSS', 'Frontend', 'Web Design'],
      published: true,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      readTime: 7,
    },
    {
      title: 'Introduction to Docker for Developers',
      slug: 'introduction-to-docker-for-developers',
      content: `# Introduction to Docker for Developers

Docker is a platform that enables developers to package applications into containers—standardized executable components combining application source code with the operating system libraries and dependencies.

## Why Docker?

- **Consistency**: Same environment everywhere
- **Isolation**: No conflicts between dependencies
- **Portability**: Run anywhere Docker is installed
- **Efficiency**: Lightweight compared to VMs

## Your First Dockerfile

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
\`\`\`

Start containerizing your applications today!`,
      excerpt: 'Get started with Docker and containerize your applications',
      tags: ['Docker', 'DevOps', 'Deployment'],
      published: true,
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      readTime: 10,
    },
  ];

  for (const blog of blogs) {
    await prisma.blog.upsert({
      where: { slug: blog.slug },
      update: {},
      create: blog,
    });
  }
  console.log('✅ Blog posts created');

  // Skills
  const skills = [
    { category: 'Frontend', name: 'React', level: 90, order: 1 },
    { category: 'Frontend', name: 'TypeScript', level: 85, order: 2 },
    { category: 'Frontend', name: 'Next.js', level: 80, order: 3 },
    { category: 'Frontend', name: 'TailwindCSS', level: 88, order: 4 },
    { category: 'Frontend', name: 'Vue.js', level: 75, order: 5 },
    { category: 'Backend', name: 'Node.js', level: 90, order: 1 },
    { category: 'Backend', name: 'Express', level: 85, order: 2 },
    { category: 'Backend', name: 'PostgreSQL', level: 80, order: 3 },
    { category: 'Backend', name: 'Prisma', level: 82, order: 4 },
    { category: 'Backend', name: 'MongoDB', level: 78, order: 5 },
    { category: 'DevOps', name: 'Docker', level: 75, order: 1 },
    { category: 'DevOps', name: 'AWS', level: 70, order: 2 },
    { category: 'DevOps', name: 'CI/CD', level: 72, order: 3 },
    { category: 'DevOps', name: 'Nginx', level: 68, order: 4 },
    { category: 'Tools', name: 'Git', level: 92, order: 1 },
    { category: 'Tools', name: 'VS Code', level: 95, order: 2 },
    { category: 'Tools', name: 'Postman', level: 85, order: 3 },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }
  console.log('✅ Skills created');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
