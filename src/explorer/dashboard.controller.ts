import { Controller, Get, Req, Res, Type } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join, normalize } from 'path';

const PUBLIC_DIR = join(__dirname, '..', 'public');

export function createDashboardController(
  dashboardPath: string,
): Type<unknown> {
  @Controller(dashboardPath)
  class DashboardController {
    @Get()
    serveIndex(@Res() res: Response) {
      res.sendFile(join(PUBLIC_DIR, 'index.html'));
    }

    @Get('*path')
    serveAsset(@Req() req: Request, @Res() res: Response) {
      const prefix = `/${dashboardPath}/`;
      const rawPath = req.path.startsWith(prefix)
        ? req.path.slice(prefix.length)
        : req.path.slice(1);

      const safe = normalize(rawPath).replace(/^(\.\.\/|\.\.\\)+/, '');
      const filePath = join(PUBLIC_DIR, safe);

      res.sendFile(filePath, (err) => {
        if (err) res.status(404).end();
      });
    }
  }
  return DashboardController;
}
