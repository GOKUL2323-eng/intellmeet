import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { TaskModel } from '../models/Task';
import { TaskPriority, TaskStatus } from '@intellmeet/shared';

import mongoose from 'mongoose';

export class TaskController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.createTask({
        workspaceId: req.workspaceId!,
        creatorId: req.user!._id.toString(),
        title: req.body.title,
        description: req.body.description,
        projectId: req.body.projectId,
        meetingId: req.body.meetingId,
        actionItemId: req.body.actionItemId,
        assigneeId: req.body.assigneeId,
        dueDate: req.body.dueDate,
        priority: req.body.priority as TaskPriority,
        status: req.body.status as TaskStatus,
        tags: req.body.tags
      });

      res.status(201).json({ message: 'Task created successfully.', task });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspaceId!;
      const tasks = await TaskService.listTasks({
        workspaceId,
        status: req.query.status as TaskStatus,
        priority: req.query.priority as TaskPriority,
        assigneeId: req.query.assigneeId as string,
        projectId: req.query.projectId as string,
        search: req.query.search as string
      });

      res.json({ tasks });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      const task = await TaskModel.findOne({
        _id: new mongoose.Types.ObjectId(req.params.taskId),
        workspaceId: new mongoose.Types.ObjectId(req.workspaceId!)
      })
        .populate('assigneeId', 'fullName email avatarUrl')
        .populate('creatorId', 'fullName email avatarUrl');

      if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      res.json({ task });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.updateTask(
        req.params.taskId,
        req.workspaceId!,
        req.user!._id.toString(),
        req.body
      );

      res.json({ message: 'Task updated.', task });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await TaskService.deleteTask(
        req.params.taskId,
        req.workspaceId!,
        req.user!._id.toString()
      );

      res.json({ message: 'Task deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.addComment(
        req.params.taskId,
        req.workspaceId!,
        {
          id: req.user!._id.toString(),
          fullName: req.user!.fullName,
          avatarUrl: req.user!.avatarUrl
        },
        req.body.text
      );

      res.status(201).json({ message: 'Comment added.', task });
    } catch (err) {
      next(err);
    }
  }

  static async convertActionItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { actionItemId, assigneeId } = req.body;
      const result = await TaskService.convertActionItemToTask(
        actionItemId,
        req.workspaceId!,
        req.user!._id.toString(),
        assigneeId
      );

      res.status(201).json({
        message: 'Action item converted to task.',
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
}
