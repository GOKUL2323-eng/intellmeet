import mongoose from 'mongoose';
import { TaskModel, ITaskDocument } from '../models/Task';
import { ActionItemModel } from '../models/ActionItem';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';
import { TaskStatus, TaskPriority, AuditAction, NotificationType } from '@intellmeet/shared';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';

export class TaskService {
  static async createTask(data: {
    workspaceId: string;
    creatorId: string;
    title: string;
    description?: string;
    projectId?: string;
    meetingId?: string;
    actionItemId?: string;
    assigneeId?: string;
    dueDate?: string | Date;
    priority?: TaskPriority;
    status?: TaskStatus;
    tags?: string[];
  }): Promise<ITaskDocument> {
    // Prevent duplicate task creation if originating action item was already converted
    if (data.actionItemId && mongoose.Types.ObjectId.isValid(data.actionItemId)) {
      const existingTask = await TaskModel.findOne({
        actionItemId: new mongoose.Types.ObjectId(data.actionItemId)
      });
      if (existingTask) {
        return existingTask;
      }
    }

    // Validate assignee belongs to the target workspace
    if (data.assigneeId && mongoose.Types.ObjectId.isValid(data.assigneeId)) {
      const isMember = await WorkspaceMembershipModel.findOne({
        workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
        userId: new mongoose.Types.ObjectId(data.assigneeId),
        status: 'ACTIVE'
      });
      if (!isMember) {
        throw { statusCode: 400, message: 'Assignee is not an active member of this workspace.' };
      }
    }

    const task = await TaskModel.create({
      workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
      creatorId: new mongoose.Types.ObjectId(data.creatorId),
      title: data.title,
      description: data.description || '',
      projectId: data.projectId ? new mongoose.Types.ObjectId(data.projectId) : undefined,
      meetingId: data.meetingId ? new mongoose.Types.ObjectId(data.meetingId) : undefined,
      actionItemId: data.actionItemId ? new mongoose.Types.ObjectId(data.actionItemId) : undefined,
      assigneeId: data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority || TaskPriority.MEDIUM,
      status: data.status || TaskStatus.TODO,
      tags: data.tags || []
    });

    await AuditService.log({
      userId: data.creatorId,
      workspaceId: data.workspaceId,
      action: AuditAction.TASK_CREATED,
      entityType: 'Task',
      entityId: task._id.toString(),
      details: { title: data.title, status: task.status }
    });

    // Notify assignee if assigned
    if (data.assigneeId && data.assigneeId !== data.creatorId) {
      await NotificationService.createNotification({
        userId: data.assigneeId,
        workspaceId: data.workspaceId,
        title: 'New Task Assigned',
        message: `You were assigned task: "${data.title}"`,
        type: NotificationType.TASK_ASSIGNED,
        link: `/tasks?taskId=${task._id}`
      });
    }

    return task;
  }

  static async listTasks(params: {
    workspaceId: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    projectId?: string;
    search?: string;
  }) {
    const query: Record<string, unknown> = {
      workspaceId: new mongoose.Types.ObjectId(params.workspaceId)
    };

    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    if (params.assigneeId) query.assigneeId = new mongoose.Types.ObjectId(params.assigneeId);
    if (params.projectId) query.projectId = new mongoose.Types.ObjectId(params.projectId);

    if (params.search) {
      const safeSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    return TaskModel.find(query)
      .sort({ createdAt: -1 })
      .populate('assigneeId', 'fullName email avatarUrl')
      .populate('creatorId', 'fullName email avatarUrl');
  }

  static async updateTask(
    taskId: string,
    workspaceId: string,
    userId: string,
    updates: Partial<{
      title: string;
      description: string;
      assigneeId: string | null;
      dueDate: string | Date | null;
      priority: TaskPriority;
      status: TaskStatus;
      tags: string[];
    }>
  ) {
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw { statusCode: 400, message: 'Invalid task or workspace ID.' };
    }

    const task = await TaskModel.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    });

    if (!task) {
      throw { statusCode: 404, message: 'Task not found.' };
    }

    const previousStatus = task.status;
    const previousAssignee = task.assigneeId?.toString();

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.tags !== undefined) task.tags = updates.tags;

    if (updates.dueDate !== undefined) {
      task.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
    }

    if (updates.assigneeId !== undefined) {
      if (updates.assigneeId) {
        const isMember = await WorkspaceMembershipModel.findOne({
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          userId: new mongoose.Types.ObjectId(updates.assigneeId),
          status: 'ACTIVE'
        });
        if (!isMember) {
          throw { statusCode: 400, message: 'Assignee is not an active member of this workspace.' };
        }
      }
      task.assigneeId = updates.assigneeId
        ? new mongoose.Types.ObjectId(updates.assigneeId)
        : undefined;
    }

    await task.save();

    await AuditService.log({
      userId,
      workspaceId,
      action: AuditAction.TASK_UPDATED,
      entityType: 'Task',
      entityId: task._id.toString(),
      details: { updates }
    });

    // Notify new assignee if changed
    const newAssigneeStr = task.assigneeId?.toString();
    if (newAssigneeStr && newAssigneeStr !== previousAssignee && newAssigneeStr !== userId) {
      await NotificationService.createNotification({
        userId: newAssigneeStr,
        workspaceId,
        title: 'Task Assigned',
        message: `You were assigned task: "${task.title}"`,
        type: NotificationType.TASK_ASSIGNED,
        link: `/tasks?taskId=${task._id}`
      });
    }

    // Notify assignee if status changed
    if (updates.status && updates.status !== previousStatus && newAssigneeStr && newAssigneeStr !== userId) {
      await NotificationService.createNotification({
        userId: newAssigneeStr,
        workspaceId,
        title: 'Task Status Updated',
        message: `Task "${task.title}" was moved to ${updates.status}`,
        type: NotificationType.TASK_UPDATED,
        link: `/tasks?taskId=${task._id}`
      });
    }

    return task.populate('assigneeId', 'fullName email avatarUrl');
  }

  static async deleteTask(taskId: string, workspaceId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw { statusCode: 400, message: 'Invalid task or workspace ID.' };
    }

    const result = await TaskModel.deleteOne({
      _id: new mongoose.Types.ObjectId(taskId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    });

    if (result.deletedCount === 0) {
      throw { statusCode: 404, message: 'Task not found.' };
    }

    await AuditService.log({
      userId,
      workspaceId,
      action: AuditAction.TASK_DELETED,
      entityType: 'Task',
      entityId: taskId
    });

    return { success: true };
  }

  static async addComment(
    taskId: string,
    workspaceId: string,
    user: { id: string; fullName: string; avatarUrl?: string },
    text: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw { statusCode: 400, message: 'Invalid task or workspace ID.' };
    }

    const task = await TaskModel.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    });

    if (!task) {
      throw { statusCode: 404, message: 'Task not found.' };
    }

    task.comments.push({
      userId: new mongoose.Types.ObjectId(user.id),
      userName: user.fullName,
      userAvatar: user.avatarUrl,
      text: text.trim(),
      createdAt: new Date()
    });

    await task.save();
    return task;
  }

  static async convertActionItemToTask(
    actionItemId: string,
    workspaceId: string,
    userId: string,
    assigneeId?: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(actionItemId) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw { statusCode: 400, message: 'Invalid action item or workspace ID.' };
    }

    const actionItem = await ActionItemModel.findOne({
      _id: new mongoose.Types.ObjectId(actionItemId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    });

    if (!actionItem) {
      throw { statusCode: 404, message: 'Action item not found.' };
    }

    // Idempotent retry check: if already converted and linked to a task, return existing task
    if (actionItem.status === 'CONVERTED' && actionItem.taskId) {
      const existingTask = await TaskModel.findOne({
        _id: actionItem.taskId,
        workspaceId: new mongoose.Types.ObjectId(workspaceId)
      });
      if (existingTask) {
        return { task: existingTask, actionItem };
      }
    }

    const existingByActionItem = await TaskModel.findOne({
      actionItemId: actionItem._id,
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    });
    if (existingByActionItem) {
      actionItem.status = 'CONVERTED';
      actionItem.taskId = existingByActionItem._id as mongoose.Types.ObjectId;
      await actionItem.save();
      return { task: existingByActionItem, actionItem };
    }

    const task = await this.createTask({
      workspaceId,
      creatorId: userId,
      title: actionItem.title,
      description: actionItem.description,
      meetingId: actionItem.meetingId.toString(),
      actionItemId: actionItem._id.toString(),
      assigneeId: assigneeId || actionItem.assigneeId?.toString(),
      dueDate: actionItem.dueDate,
      priority: actionItem.priority,
      status: TaskStatus.TODO
    });

    actionItem.status = 'CONVERTED';
    actionItem.taskId = task._id as mongoose.Types.ObjectId;
    await actionItem.save();

    return { task, actionItem };
  }
}
