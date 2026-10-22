import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { loginLimiter, tokenCreateLimiter } from '../middleware/security';
import * as pub from '../controllers/publicController';
import * as tok from '../controllers/tokenController';
import * as auth from '../controllers/authController';
import * as staff from '../controllers/staffController';
import * as owner from '../controllers/ownerController';

const api = Router();

// ---- Public ----
api.get('/health', pub.health);
api.get('/services', pub.listServices);
api.get('/services/:id', pub.getService);
api.get('/barbers', pub.listBarbers);
api.get('/settings/public', pub.publicSettings);
api.get('/queue/today', pub.queueToday);

api.post('/tokens/online', tokenCreateLimiter, tok.createOnlineToken);
api.get('/tokens/:trackingToken', tok.getTokenByTracking);
api.patch('/tokens/:trackingToken/cancel', tok.cancelOwnToken);

// ---- Auth ----
api.post('/auth/login', loginLimiter, auth.login);
api.post('/auth/logout', auth.logout);
api.get('/auth/me', authenticate, auth.me);

// ---- Staff (owner, barber, staff) ----
const s = Router();
s.use(authenticate, requireRole('owner', 'barber', 'staff'));
s.get('/queue', staff.getQueue);
s.post('/tokens/walk-in', staff.createWalkIn);
s.post('/queue/call-next', requireRole('barber'), staff.callNext);
s.patch('/tokens/:id/start', requireRole('barber', 'owner'), staff.startToken);
s.patch('/tokens/:id/complete', requireRole('barber', 'owner'), staff.completeToken);
s.patch('/tokens/:id/skip', staff.skipToken);
s.patch('/tokens/:id/cancel', requireRole('owner', 'staff'), staff.cancelToken);
s.patch('/tokens/:id/requeue', requireRole('owner', 'staff'), staff.requeueToken);
s.patch('/availability', requireRole('barber'), staff.setAvailability);
api.use('/staff', s);

// ---- Owner only ----
const o = Router();
o.use(authenticate, requireRole('owner'));
o.get('/dashboard', owner.dashboard);
o.get('/tokens', owner.listTokens);
o.get('/reports/daily', owner.dailyReport);
o.get('/reports/monthly', owner.monthlyReport);
o.get('/reports/range', owner.rangeReport);
o.get('/services', owner.listServicesOwner);
o.post('/services', owner.createService);
o.patch('/services/:id', owner.updateService);
o.delete('/services/:id', owner.deleteService);
o.get('/barbers', owner.listBarbers);
o.post('/barbers', owner.createBarber);
o.patch('/barbers/:id', owner.updateBarber);
o.patch('/tokens/:id/reassign', owner.reassign);
o.get('/settings', owner.getOwnerSettings);
o.patch('/settings', owner.updateSettings);
o.get('/audit', owner.listAudit);
api.use('/owner', o);

export default api;
