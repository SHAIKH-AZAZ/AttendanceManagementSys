import type { PaymentGatewayId } from '@/types';
import type { Gateway } from './common';
import { razorpay } from './razorpay';
import { cashfree } from './cashfree';
import { payu } from './payu';
import { paytm } from './paytm';
import { stripe } from './stripe';
import { paypal } from './paypal';

/** Every gateway, in the order students see them. A gateway shows up once its test keys are in the environment. */
export const GATEWAYS: Record<PaymentGatewayId, Gateway> = { razorpay, cashfree, payu, paytm, stripe, paypal };

export const isGatewayId = (id: unknown): id is PaymentGatewayId => typeof id === 'string' && id in GATEWAYS;

export const configuredGateways = () => Object.values(GATEWAYS).filter((g) => g.configured()).map((g) => g.id);

export { confirmRazorpay } from './razorpay';
export * from './common';
