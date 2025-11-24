import { Hono } from 'hono';
import { html } from 'hono/html';
import type { Env } from '../types';
import dashboardHTML from '../pages/settings-dashboard.html';

const router = new Hono<{ Bindings: Env }>();

router.get('/', (c) => {
  return c.html(dashboardHTML);
});

export default router;
