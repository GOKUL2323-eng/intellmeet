import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspaceId!;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      const overview = await AnalyticsService.getOverview(workspaceId, days);
      res.json({ overview });
    } catch (err) {
      next(err);
    }
  }

  static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspaceId!;
      const csv = await AnalyticsService.generateCSVExport(workspaceId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=intellmeet-export-${workspaceId}-${Date.now()}.csv`
      );
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
}
