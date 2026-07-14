import "stripe";

declare module "stripe" {
  namespace Stripe {
    interface Account {
      /**
       * Present on account objects delivered by some Stripe event payloads even though the
       * generated SDK Account type does not currently expose it. Event-level reconciliation
       * must still fail closed when the value is absent.
       */
      livemode?: boolean;
    }
  }
}
