import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { UsersService } from "../users/users.service";
import { GengarSubscriptionPlan, User } from "src/db/entities/user.entity";
import { UserRepository } from "src/db/repositories/user.repository";

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly userRepository: UserRepository,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
  }

  // Subscribe user for the first time.
  // If there is no stripeCustomerId, create new customer
  // If user already has a subscription, throw an error
  // One user can only have one subscription on Stripe
  async createCheckoutSession(priceId: string, user: User) {
    console.log("user", JSON.stringify(user, null, 2));
    try {
      let session: Stripe.Response<Stripe.Checkout.Session>;

      // If user has a subscription, check if it's still active or trialing
      if (user.stripeCustomerId && user.stripeSubscriptionId) {
        const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        // If subscription is still active or trialing, prevent new checkout
        // Possible values are incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, or paused.
        if (["active", "trialing", "past_due", "unpaid", "incomplete"].includes(subscription.status)) {
          throw new BadRequestException("Customer already has an active subscription");
        }

        // If subscription is canceled/expired, create a new subscription
        if (["canceled", "expired"].includes(subscription.status)) {
          session = await this.stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            metadata: { userId: user.id },
            allow_promotion_codes: true,
            success_url: `${this.configService.get("frontend_url")}/subscription-success`,
            cancel_url: `${this.configService.get("frontend_url")}`,
            customer: user.stripeCustomerId,
            // No trial for returning customers
          });

          return session;
        }
      }

      // For new customers
      if (!user.stripeCustomerId) {
        // Search for existing customer by email
        const existingCustomers = await this.stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        let stripeCustomerId: string;

        if (existingCustomers.data.length > 0) {
          // Use existing customer
          stripeCustomerId = existingCustomers.data[0].id;
        } else {
          // Create new customer if none exists
          const newCustomer = await this.stripe.customers.create({
            name: user.name,
            email: user.email,
            metadata: {
              userId: user.id,
            },
          });
          stripeCustomerId = newCustomer.id;
        }

        // Update user with Stripe customer ID
        user.stripeCustomerId = stripeCustomerId;
        await this.userRepository.update(user.id, { stripeCustomerId });
      }

      session = await this.createSession(priceId, user, user.stripeCustomerId);
      return session;
    } catch (error) {
      console.log("error", JSON.stringify(error, null, 2));
      throw new InternalServerErrorException("Failed to create checkout session");
    }
  }

  async createSession(
    priceId: string,
    user: User,
    stripeCustomerId: string,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    return await this.stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
      },
      allow_promotion_codes: true,
      success_url: `${this.configService.get("frontend_url")}/subscription-success`,
      cancel_url: `${this.configService.get("frontend_url")}`,
      customer: stripeCustomerId,
    });
  }

  async cancelSubscription(stripeCustomerId: string) {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: stripeCustomerId,
      });

      console.log("subscriptions length", JSON.stringify(subscriptions.data.length, null, 2));

      if (subscriptions.data.length === 1) {
        const subscription = subscriptions.data[0];

        // Cancel the subscription at the end of the billing period
        const updatedSubscription = await this.stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
        });

        console.log("updatedSubscription", updatedSubscription);
      } else if (subscriptions.data.length >= 2) {
        throw new NotFoundException("More than one active subscription found");
      } else {
        throw new NotFoundException("No active subscription found");
      }
    } catch (error) {
      // Handle Stripe API errors
      console.log("error", JSON.stringify(error, null, 2));
      throw new InternalServerErrorException("Failed to cancel subscription");
    }
  }

  async constructEventFromPayload(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  }

  // Update subscriptionPlan to user table
  // Update stripeCustomerId to user table
  async handleSuccessfulPaymentAfterCheckout(session: Stripe.Checkout.Session) {
    const userId = Number(session.metadata.userId);
    console.log("handleSuccessfulPaymentAfterCheckout", JSON.stringify(session, null, 2));

    const stripeCustomerId = session.customer as string;

    await this.userService.updateUserAfterPayment(userId, {
      subscriptionPlan: GengarSubscriptionPlan.PLUS, // Or whatever plan name you're using
      stripeCustomerId: stripeCustomerId,
      stripeSubscriptionId: session.subscription as string,
    });
  }

  async handleSubscriptionCancellation(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId = subscription.customer as string;
    console.log("handleSubscriptionCancellation", JSON.stringify(subscription, null, 2));

    // If today is the end of the billing period, the subscription plan will be updated to FREE
    // Otherwise, the subscription plan will remain PLUS
    let subscriptionPlan = GengarSubscriptionPlan.PLUS;
    const currentUnixTime = Math.floor(Date.now() / 1000);
    if ((subscription.cancel_at && subscription.cancel_at < currentUnixTime) || subscription.status === "canceled") {
      subscriptionPlan = GengarSubscriptionPlan.FREE;
    }
    const user = await this.userRepository.findOneBy({
      stripeCustomerId: stripeCustomerId,
    });
    return await this.userRepository.update(
      { stripeCustomerId: stripeCustomerId },
      {
        subscriptionPlan,
        subscriptionPlanCancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        updatedAt: new Date(),
        defaultTextModelId: subscriptionPlan === GengarSubscriptionPlan.PLUS ? user?.defaultTextModelId : 1,
        defaultImageModelId: subscriptionPlan === GengarSubscriptionPlan.PLUS ? user?.defaultImageModelId : 14,
      },
    );
  }

  async handleFailedSubscriptionPayment(invoice: Stripe.Invoice) {
    const stripeCustomerId = invoice.customer as string;

    const user = await this.userRepository.findOneBy({
      stripeCustomerId: stripeCustomerId,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return await this.userRepository.update(
      { stripeCustomerId: stripeCustomerId },
      {
        subscriptionPlan: GengarSubscriptionPlan.FREE,
        updatedAt: new Date(),
        defaultTextModelId: 1,
        defaultImageModelId: 14,
      },
    );
  }

  async handleSuccessfulSubscriptionPayment(invoice: Stripe.Invoice) {
    const stripeCustomerId = invoice.customer as string;

    const user = await this.userRepository.findOneBy({
      stripeCustomerId: stripeCustomerId,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return await this.userRepository.update(
      { stripeCustomerId: stripeCustomerId },
      {
        subscriptionPlan: GengarSubscriptionPlan.PLUS,
        subscriptionPlanCancelAt: null,
        updatedAt: new Date(),
      },
    );
  }
}
