import { Router, RequestHandler } from 'express';
import projectAdminsRoutes from './projectAdmins.routes.js';
import usersRoutes from './users.routes.js';
import subscriptionsRoutes from './subscriptions.routes.js';
import plansRoutes from './plans.routes.js';
import customersRoutes from './customers.routes.js';
import carsRoutes from './cars.routes.js';

interface RouteConfig {
  path: string;
  router: Router;
  middleware?: RequestHandler;
}

const routes: RouteConfig[] = [
  { path: '/project-admins', router: projectAdminsRoutes },
  { path: '/users', router: usersRoutes },
  { path: '/subscriptions', router: subscriptionsRoutes },
  { path: '/plans', router: plansRoutes },
  { path: '/customers', router: customersRoutes },
  { path: '/cars', router: carsRoutes }
];

export {
  routes,
  projectAdminsRoutes,
  usersRoutes,
  subscriptionsRoutes,
  plansRoutes,
  customersRoutes,
  carsRoutes
};
