import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllPrepResources = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { domain, company, experience } = req.query;

    const filters: any = {};
    if (domain) filters.domain = domain as string;
    if (company) filters.company = company as string;
    if (experience) filters.experience = experience as string;

    const resources = await prisma.prepResource.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });

    if (userId) {
      // Fetch progress for this user
      const progress = await prisma.userTaskProgress.findMany({
        where: { userId },
      });

      const resourcesWithProgress = resources.map(resource => {
        const resourceProgress = progress.filter(p => p.resourceId === resource.id);
        const completedTaskIds = resourceProgress.map(p => p.taskId);
        return {
          ...resource,
          completedTaskIds,
        };
      });
      return res.status(200).json(resourcesWithProgress);
    }

    res.status(200).json(resources);
  } catch (error: any) {
    require('fs').writeFileSync('prep-error.txt', error.stack || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const toggleTaskProgress = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { resourceId, taskId, completed } = req.body;

    if (completed) {
      await prisma.userTaskProgress.upsert({
        where: {
          userId_resourceId_taskId: { userId, resourceId, taskId },
        },
        update: { completed: true },
        create: { userId, resourceId, taskId, completed: true },
      });
    } else {
      await prisma.userTaskProgress.deleteMany({
        where: { userId, resourceId, taskId },
      });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPrepResourceById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const resource = await prisma.prepResource.findUnique({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (userId) {
      const progress = await prisma.userTaskProgress.findMany({
        where: { userId, resourceId: id },
      });
      const completedTaskIds = progress.map(p => p.taskId);
      return res.status(200).json({ ...resource, completedTaskIds });
    }

    res.status(200).json(resource);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPrepResource = async (req: any, res: Response) => {
  try {
    const resource = await prisma.prepResource.create({
      data: req.body,
    });
    res.status(201).json(resource);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePrepResource = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const resource = await prisma.prepResource.update({
      where: { id },
      data: req.body,
    });
    res.status(200).json(resource);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePrepResource = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.prepResource.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOverallProgress = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    // Count all available tasks across all resources
    const allResources = await prisma.prepResource.findMany({
      select: { tasks: true }
    });

    let totalTasks = 0;
    allResources.forEach(r => {
      if (Array.isArray(r.tasks)) {
        totalTasks += r.tasks.length;
      }
    });

    // Count completed tasks for this user
    const completedTasksCount = await prisma.userTaskProgress.count({
      where: { userId }
    });

    const percentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    res.status(200).json({
      totalTasks,
      completedTasks: completedTasksCount,
      percentage
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
