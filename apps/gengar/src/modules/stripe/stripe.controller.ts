import { Controller, Post, Body, Req, Res, RawBodyRequest, Headers, UseGuards } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { AuthenticatedRequest } from "../common/types";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("stripe")
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @UseGuards(JwtAuthGuard)
  @Post("checkout")
  async createCheckoutSession(@Req() req: AuthenticatedRequest) {
    const session = await this.stripeService.createCheckoutSession(process.env.STRIPE_PRICE_ID as string, req.user);
    return session;
  }

  @UseGuards(JwtAuthGuard)
  @Post("cancel")
  async cancelSubscription(@Req() req: AuthenticatedRequest) {
    await this.stripeService.cancelSubscription(req.user.stripeCustomerId);
    return;
  }

  @Post("webhook")
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    if (!signature) {
      console.log("Missing stripe-signature header");
      return res.status(400).send("Missing stripe-signature header");
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      console.log("Missing raw body");
      return res.status(400).send("Missing raw body");
    }
    try {
      const event = await this.stripeService.constructEventFromPayload(rawBody, signature);

      switch (event.type) {
        case "checkout.session.completed":
          console.log("session completed", JSON.stringify(event, null, 2));
          const session = event.data.object;
          await this.stripeService.handleSuccessfulPaymentAfterCheckout(session);
          break;

        case "customer.subscription.deleted":
          const deletedSubscription = event.data.object;
          console.log("deleted subscription", deletedSubscription.id);
          if (deletedSubscription.cancel_at_period_end) {
            await this.stripeService.handleSubscriptionCancellation(event);
          }
          break;

        case "customer.subscription.updated":
          const updatedSubscription = event.data.object;
          console.log("updated subscription", updatedSubscription.id);
          if (updatedSubscription.cancel_at_period_end) {
            await this.stripeService.handleSubscriptionCancellation(event);
          }
          break;

        case "invoice.paid":
          console.log("payment succeeded", event?.data?.object?.id);
          await this.stripeService.handleSuccessfulSubscriptionPayment(event.data.object);
          break;

        case "invoice.payment_failed":
          console.log("payment failed", event?.data?.object?.id);
          // Update the plan to free
          await this.stripeService.handleFailedSubscriptionPayment(event.data.object);
          break;
      }

      res.status(200).send();
    } catch (err) {
      console.error("Webhook Error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
