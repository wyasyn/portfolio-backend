import { prisma } from '@/db/prisma';
import { AnalyticsSummary } from '@/types';

interface ViewEventData {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

export class AnalyticsService {
  async trackView(type: 'project' | 'blog', id: string, data: ViewEventData): Promise<void> {
    const viewEventData = {
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      referrer: data.referrer,
      country: data.country,
      city: data.city,
      ...(type === 'project' ? { projectId: id } : { blogId: id }),
    };

    await prisma.viewEvent.create({ data: viewEventData });
  }

  async getSummary(): Promise<AnalyticsSummary> {
    const [projectAnalytics, blogAnalytics, totalStats] = await Promise.all([
      prisma.viewEvent.groupBy({
        by: ['projectId'],
        where: { projectId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.viewEvent.groupBy({
        by: ['blogId'],
        where: { blogId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.viewEvent.aggregate({
        _count: { id: true },
      }),
    ]);

    // Get project details
    const projectIds = projectAnalytics
      .map((item) => item.projectId)
      .filter((id): id is string => id !== null);

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, title: true },
    });

    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const topProjects = projectAnalytics
      .map((item) => {
        const project = projectMap.get(item.projectId!);
        if (!project) return null;
        return {
          id: project.id,
          title: project.title,
          views: item._count.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Get blog details
    const blogIds = blogAnalytics
      .map((item) => item.blogId)
      .filter((id): id is string => id !== null);

    const blogs = await prisma.blog.findMany({
      where: { id: { in: blogIds } },
      select: { id: true, title: true },
    });

    const blogMap = new Map(blogs.map((b) => [b.id, b]));

    const topBlogs = blogAnalytics
      .map((item) => {
        const blog = blogMap.get(item.blogId!);
        if (!blog) return null;
        return {
          id: blog.id,
          title: blog.title,
          views: item._count.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const projectViews = projectAnalytics.reduce((sum, item) => sum + item._count.id, 0);
    const blogViews = blogAnalytics.reduce((sum, item) => sum + item._count.id, 0);

    return {
      topProjects,
      topBlogs,
      totalViews: totalStats._count.id,
      projectViews,
      blogViews,
    };
  }

  async getProjectViews(projectId: string): Promise<number> {
    const count = await prisma.viewEvent.count({
      where: { projectId },
    });
    return count;
  }

  async getBlogViews(blogId: string): Promise<number> {
    const count = await prisma.viewEvent.count({
      where: { blogId },
    });
    return count;
  }

  async getViewsByDateRange(
    type: 'project' | 'blog',
    id: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; views: number }>> {
    const where = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
      ...(type === 'project' ? { projectId: id } : { blogId: id }),
    };

    const views = await prisma.viewEvent.findMany({
      where,
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    // Group by date
    const viewsByDate = views.reduce(
      (acc, view) => {
        const dateKey = view.timestamp.toISOString().split('T')[0];
        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(viewsByDate).map(([date, views]) => ({
      date: new Date(date),
      views,
    }));
  }

  async getTopReferrers(limit = 10): Promise<Array<{ referrer: string; count: number }>> {
    const referrers = await prisma.viewEvent.groupBy({
      by: ['referrer'],
      where: {
        referrer: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return referrers.map((item) => ({
      referrer: item.referrer!,
      count: item._count.id,
    }));
  }

  async getTopCountries(limit = 10): Promise<Array<{ country: string; count: number }>> {
    const countries = await prisma.viewEvent.groupBy({
      by: ['country'],
      where: {
        country: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return countries.map((item) => ({
      country: item.country!,
      count: item._count.id,
    }));
  }

  async deleteOldViewEvents(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.viewEvent.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

export const analyticsService = new AnalyticsService();
