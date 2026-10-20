import mongoose from 'mongoose';
import { MeetingModel } from '../models/Meeting';
import { TaskModel } from '../models/Task';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';
import { MeetingStatus, TaskStatus, TaskPriority, IAnalyticsOverview } from '@intellmeet/shared';

export class AnalyticsService {
  static async getOverview(workspaceId: string, days = 30): Promise<IAnalyticsOverview> {
    const wsId = new mongoose.Types.ObjectId(workspaceId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Run parallel aggregation pipelines
    const [
      meetingsCount,
      completedMeetings,
      scheduledMeetings,
      tasks,
      membersCount,
      meetingsTimeline
    ] = await Promise.all([
      MeetingModel.countDocuments({ workspaceId: wsId, createdAt: { $gte: startDate } }),
      MeetingModel.countDocuments({ workspaceId: wsId, status: MeetingStatus.ENDED }),
      MeetingModel.countDocuments({ workspaceId: wsId, status: MeetingStatus.SCHEDULED }),
      TaskModel.find({ workspaceId: wsId }),
      WorkspaceMembershipModel.countDocuments({ workspaceId: wsId, status: 'ACTIVE' }),
      MeetingModel.aggregate([
        {
          $match: {
            workspaceId: wsId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            durationEstimate: { $sum: 35 } // average minutes per meeting
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const pendingTasks = totalTasks - completedTasks;
    const now = new Date();
    const overdueTasks = tasks.filter(
      t => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE
    ).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Tasks grouped by status
    const tasksByStatus = [
      { status: TaskStatus.TODO, count: tasks.filter(t => t.status === TaskStatus.TODO).length },
      { status: TaskStatus.IN_PROGRESS, count: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
      { status: TaskStatus.IN_REVIEW, count: tasks.filter(t => t.status === TaskStatus.IN_REVIEW).length },
      { status: TaskStatus.DONE, count: completedTasks }
    ];

    // Tasks grouped by priority
    const tasksByPriority = [
      { priority: TaskPriority.LOW, count: tasks.filter(t => t.priority === TaskPriority.LOW).length },
      { priority: TaskPriority.MEDIUM, count: tasks.filter(t => t.priority === TaskPriority.MEDIUM).length },
      { priority: TaskPriority.HIGH, count: tasks.filter(t => t.priority === TaskPriority.HIGH).length },
      { priority: TaskPriority.URGENT, count: tasks.filter(t => t.priority === TaskPriority.URGENT).length }
    ];

    const meetingsByDay = meetingsTimeline.map(m => ({
      date: m._id,
      count: m.count,
      minutes: m.durationEstimate
    }));

    return {
      totalMeetings: meetingsCount,
      totalMeetingMinutes: meetingsCount * 35,
      scheduledMeetingsCount: scheduledMeetings,
      completedMeetingsCount: completedMeetings,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      totalMembers: membersCount,
      meetingsByDay,
      tasksByStatus,
      tasksByPriority
    };
  }

  static async generateCSVExport(workspaceId: string): Promise<string> {
    const wsId = new mongoose.Types.ObjectId(workspaceId);
    const [meetings, tasks] = await Promise.all([
      MeetingModel.find({ workspaceId: wsId }).sort({ createdAt: -1 }),
      TaskModel.find({ workspaceId: wsId }).sort({ createdAt: -1 })
    ]);

    let csv = '--- INTELLMEET WORKSPACE EXPORT ---\n';
    csv += `Export Date: ${new Date().toISOString()}\n\n`;

    csv += '--- MEETINGS ---\n';
    csv += 'Meeting Code,Title,Status,Scheduled Start,Scheduled End,AI Status\n';
    meetings.forEach(m => {
      csv += `"${m.meetingCode}","${m.title.replace(/"/g, '""')}","${m.status}","${m.scheduledStartTime.toISOString()}","${m.scheduledEndTime.toISOString()}","${m.aiProcessingStatus}"\n`;
    });

    csv += '\n--- TASKS ---\n';
    csv += 'Task Title,Status,Priority,Due Date,Created At\n';
    tasks.forEach(t => {
      csv += `"${t.title.replace(/"/g, '""')}","${t.status}","${t.priority}","${t.dueDate ? t.dueDate.toISOString() : 'None'}","${t.createdAt.toISOString()}"\n`;
    });

    return csv;
  }
}
