import { Response, NextFunction } from 'express';
import stripeCustomerService from '../../../../stripe/services/customer.service.js';
import send from '../../../../../utils/responseHandler.util.js';
import { AuthenticatedRequest } from '../../../../auth/middlewares/role.middleware.js';

/**
 * كنترولر إدارة عملاء Stripe - Stripe Customers Controller
 */

/**
 * إنشاء عميل جديد في Stripe
 * Create new customer in Stripe
 */
export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, phone, description, metadata, paymentMethodId, address } = req.body;

    if (!email) {
      send(res, { success: false, data: null }, 'البريد الإلكتروني مطلوب', 400);
      return;
    }

    const [customer, error] = await stripeCustomerService.createCustomer({
      email,
      name,
      phone,
      description,
      metadata,
      paymentMethodId,
      address,
    });

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: customer }, 'تم إنشاء العميل بنجاح', 201);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على عميل أو إنشاؤه
 * Get or create customer
 */
export const getOrCreateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, phone, description, metadata } = req.body;

    if (!email) {
      send(res, { success: false, data: null }, 'البريد الإلكتروني مطلوب', 400);
      return;
    }

    const [customer, error] = await stripeCustomerService.getOrCreateCustomer(email, {
      name,
      phone,
      description,
      metadata,
    });

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: customer }, 'تم جلب/إنشاء العميل بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على عميل بواسطة المعرف
 * Get customer by ID
 */
export const getCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;

    if (!customerId) {
      send(res, { success: false, data: null }, 'معرف العميل مطلوب', 400);
      return;
    }

    const [customer, error] = await stripeCustomerService.getCustomer(customerId);

    if (error) {
      res.status(404);
      return next(error);
    }

    send(res, { success: true, data: customer }, 'تم جلب العميل بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * تحديث عميل
 * Update customer
 */
export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const updateData = req.body;

    if (!customerId) {
      send(res, { success: false, data: null }, 'معرف العميل مطلوب', 400);
      return;
    }

    const [customer, error] = await stripeCustomerService.updateCustomer(customerId, updateData);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: customer }, 'تم تحديث العميل بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إرفاق طريقة دفع للعميل
 * Attach payment method to customer
 */
export const attachPaymentMethod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const { paymentMethodId } = req.body;

    if (!customerId || !paymentMethodId) {
      send(res, { success: false, data: null }, 'معرف العميل ومعرف طريقة الدفع مطلوبان', 400);
      return;
    }

    const [success, error] = await stripeCustomerService.attachPaymentMethod(customerId, paymentMethodId);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: { attached: success } }, 'تم إرفاق طريقة الدفع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * الحصول على طرق الدفع للعميل
 * Get customer payment methods
 */
export const getPaymentMethods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const { type } = req.query;

    if (!customerId) {
      send(res, { success: false, data: null }, 'معرف العميل مطلوب', 400);
      return;
    }

    const [paymentMethods, error] = await stripeCustomerService.getPaymentMethods(
      customerId, 
      (type as any) || 'card'
    );

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: paymentMethods }, 'تم جلب طرق الدفع بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * إنشاء Setup Intent للعميل
 * Create setup intent for customer
 */
export const createSetupIntent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;

    if (!customerId) {
      send(res, { success: false, data: null }, 'معرف العميل مطلوب', 400);
      return;
    }

    const [setupIntent, error] = await stripeCustomerService.createSetupIntent(customerId);

    if (error) {
      res.status(400);
      return next(error);
    }

    send(res, { success: true, data: setupIntent }, 'تم إنشاء Setup Intent بنجاح', 200);
  } catch (error) {
    res.status(500);
    next(error);
  }
};
