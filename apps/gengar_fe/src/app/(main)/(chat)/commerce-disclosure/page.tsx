import { Mail } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Commerce Disclosure
      </h1>

      <div className="max-w-3xl mx-auto space-y-6">
        <p className="text-lg text-center mb-8">
          MentionAI (Beta) is a platform that allows users to access to top AI
          models by simply mentioning them in the conversation. Users can
          combine multiple AI models into one message to maximize the output
          from AI.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="font-semibold mb-2">Contact us</h2>
            <a
              href="mailto:contact@mentionai.io"
              className="text-black underline flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              contact@mentionai.io
            </a>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Address</h2>
            <p>123-0843, Japan, Tokyo, Adachi, Nishiaraisakaecho, 3-1-1</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Phone Number</h2>
            <p>We will disclose without delay if requested</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Accepted payment methods</h2>
            <p>We accept payment via debit or credit card.</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Exchanges & Returns Policy</h2>
            <p>
              As a digital service, we do not offer exchanges or returns.
              However, users can cancel their subscription at any time.
            </p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Delivery times</h2>
            <p>
              Access to our AI platform is immediate upon successful
              subscription.
            </p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Payment Period</h2>
            <p>
              Payments are processed monthly for the duration of the
              subscription.
            </p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Additional fees</h2>
            <p>There are no additional fees beyond the monthly subscription.</p>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Team</h2>
          <p className="mt-2">
            Built by{" "}
            <a
              href="https://dot.cards/sontbv"
              className="text-black underline"
              target="_blank"
            >
              Tran Ba Vinh Son
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/TranBaThanhTung"
              className="text-black underline"
              target="_blank"
            >
              Tran Ba Thanh Tung
            </a>
          </p>
        </div>
        <div>
          <h2 className="font-semibold mb-2">
            Legal Name / Head of Operations
          </h2>
          <p>Tran Ba Vinh Son</p>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Payment</h2>
          <p>
            Users can access to advanced features by subscribing to MentionAI by
            paying a monthly fee of 15 USD via debit or credit card. Users can
            cancel their subscription at any time. There are no additional fees
            beyond the monthly subscription. Payments are processed monthly for
            the duration of the subscription. Access to our AI platform is
            immediate upon successful subscription.
          </p>
        </div>
      </div>
    </div>
  );
}
