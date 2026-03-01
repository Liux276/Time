import { Request, Response, Router } from 'express';
import {
  getBackupConfig, getBackupList, restoreFromBackup, triggerBackup, updateBackupConfig,
} from '../services/backupService.js';

const router = Router();

router.get('/config', (_req: Request, res: Response) => {
  try { res.json(getBackupConfig()); }
  catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.put('/config', (req: Request, res: Response) => {
  try { res.json(updateBackupConfig(req.body)); }
  catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.post('/trigger', async (_req: Request, res: Response) => {
  try { res.json(await triggerBackup()); }
  catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const config = getBackupConfig();
    const list = await getBackupList();
    res.json({ enabled: !!config.enabled, last_backup_at: config.last_backup_at, files: list.files || [] });
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { fileName } = req.body;
    res.json(await restoreFromBackup(fileName));
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

export default router;
