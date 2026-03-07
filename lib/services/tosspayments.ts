import { loadTossPayments, TossPaymentsInstance } from "@tosspayments/payment-sdk";

const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY ?? '';

let tossPaymentsPromise: Promise<TossPaymentsInstance> | null = null;

export const getTossPayments = () => {
    if (!tossPaymentsPromise && typeof window !== "undefined") {
        tossPaymentsPromise = loadTossPayments(clientKey);
    }
    return tossPaymentsPromise;
};
