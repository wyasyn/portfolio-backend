import { prisma } from '@/db/prisma';
import { AnalyticsSummary } from '@/types';

export class AnalyticsService {
  async trackView(
    type: 'project' | 'blog',
    id: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string
  ): Promise<void> {
    const data: any = {
      ipAddress,
      userAgent,
      referrer,
    };

    if (type === 'project') {
      data.projectId = id;
      await prisma.project.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    } else {
      data.blogId = id;
      await prisma.blog.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    await prisma.viewAnalytics.create({ data });
  }

  async getSummary(): Promise<AnalyticsSummary> {
    const projectAnalytics = await prisma.viewAnalytics.groupBy({
      by: ['projectId'],
      where: { projectId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const blogAnalytics = await prisma.viewAnalytics.groupBy({
      by: ['blogId'],
      where: { blogId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topProjects = await Promise.all(
      projectAnalytics.map(async (item) => {
        const project = await prisma.project.findUnique({
          where: { id: item.projectId! },
          select: { id: true, title: true },
        });
        return {
          id: project!.id,
          title: project!.title,
          views: item._count.id,
        };
      })
    );

    const topBlogs = await Promise.all(
      blogAnalytics.map(async (item) => {
        const blog = await prisma.blog.findUnique({
          where: { id: item.blogId! },
          select: { id: true, title: true },
        });
        return {
          id: blog!.id,
          title: blog!.title,
          views: item._count.id,
        };
      })
    );

    const totalStats = await prisma.viewAnalytics.aggregate({
      _count: { id: true },
    });

    return {
      topProjects,
      topBlogs,
      totalViews: totalStats._count.id,
      projectViews: projectAnalytics.reduce((sum, item) => sum + item._count.id, 0),
      blogViews: blogAnalytics.reduce((sum, item) => sum + item._count.id, 0),
    };
  }
}

export const analyticsService = new AnalyticsService();
