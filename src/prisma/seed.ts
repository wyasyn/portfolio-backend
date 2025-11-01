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

  // Create sample projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        title: 'E-Commerce Platform',
        description: 'A full-stack e-commerce solution with React, Node.js, and PostgreSQL',
        tags: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
        stack: ['React', 'TypeScript', 'Express', 'Prisma', 'PostgreSQL'],
        featured: true,
        order: 1,
        githubUrl: 'https://github.com/example/ecommerce',
        liveUrl: 'https://ecommerce-demo.com',
      },
    }),
    prisma.project.create({
      data: {
        title: 'Task Management App',
        description: 'Collaborative task management application with real-time updates',
        tags: ['Next.js', 'Socket.io', 'MongoDB'],
        stack: ['Next.js', 'TypeScript', 'Socket.io', 'MongoDB', 'TailwindCSS'],
        featured: true,
        order: 2,
        githubUrl: 'https://github.com/example/taskapp',
        liveUrl: 'https://taskapp-demo.com',
      },
    }),
    prisma.project.create({
      data: {
        title: 'AI Image Generator',
        description: 'Image generation app using OpenAI DALL-E API',
        tags: ['React', 'OpenAI', 'Node.js'],
        stack: ['React', 'Node.js', 'OpenAI API', 'Cloudinary'],
        featured: false,
        order: 3,
        githubUrl: 'https://github.com/example/ai-images',
      },
    }),
  ]);
  console.log(`✅ Created ${projects.length} projects`);

  // Create sample blog posts
  const blogs = await Promise.all([
    prisma.blog.create({
      data: {
        title: 'Getting Started with TypeScript',
        slug: 'getting-started-with-typescript',
        content: `# Getting Started with TypeScript\n\nTypeScript is a typed superset of JavaScript that compiles to plain JavaScript.\n\n## Why TypeScript?\n\n- Static typing\n- Better IDE support\n- Improved code quality`,
        excerpt: 'Learn the basics of TypeScript and why you should use it',
        tags: ['TypeScript', 'JavaScript', 'Programming'],
        published: true,
        publishedAt: new Date(),
      },
    }),
    prisma.blog.create({
      data: {
        title: 'Building REST APIs with Express and Prisma',
        slug: 'building-rest-apis-with-express-and-prisma',
        content: `# Building REST APIs\n\nLearn how to build production-ready REST APIs using Express.js and Prisma ORM.\n\n## Key Concepts\n\n1. Route handling\n2. Middleware\n3. Database integration`,
        excerpt: 'A comprehensive guide to building REST APIs',
        tags: ['Express', 'Prisma', 'Node.js', 'API'],
        published: true,
        publishedAt: new Date(),
      },
    }),
    prisma.blog.create({
      data: {
        title: 'Understanding React Hooks',
        slug: 'understanding-react-hooks',
        content: `# React Hooks\n\nHooks are a way to use state and other React features without writing a class.\n\n## Common Hooks\n\n- useState\n- useEffect\n- useContext`,
        excerpt: 'Master React Hooks for functional components',
        tags: ['React', 'JavaScript', 'Frontend'],
        published: false,
      },
    }),
  ]);
  console.log(`✅ Created ${blogs.length} blog posts`);

  // Create sample skills
  const skills = await Promise.all([
    prisma.skill.create({
      data: {
        category: 'Frontend',
        name: 'React',
        level: 90,
        order: 1,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'Frontend',
        name: 'TypeScript',
        level: 85,
        order: 2,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'Frontend',
        name: 'Next.js',
        level: 80,
        order: 3,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'Backend',
        name: 'Node.js',
        level: 90,
        order: 1,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'Backend',
        name: 'Express',
        level: 85,
        order: 2,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'Backend',
        name: 'PostgreSQL',
        level: 80,
        order: 3,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'DevOps',
        name: 'Docker',
        level: 75,
        order: 1,
      },
    }),
    prisma.skill.create({
      data: {
        category: 'DevOps',
        name: 'AWS',
        level: 70,
        order: 2,
      },
    }),
  ]);
  console.log(`✅ Created ${skills.length} skills`);

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
