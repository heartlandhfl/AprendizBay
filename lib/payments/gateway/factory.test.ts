import { afterEach, describe, expect, it } from "vitest";
import {
  createPaymentGateway,
  getPaymentProvider,
} from "@/lib/payments/gateway/factory";
import { AsaasGateway } from "@/lib/payments/gateway/asaas-gateway";
import { InfinitePayGateway } from "@/lib/payments/gateway/infinitepay-gateway";
import { MercadoPagoGateway } from "@/lib/payments/gateway/mercadopago-gateway";

describe("payment gateway factory", () => {
  const original = process.env.PAYMENT_PROVIDER;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PAYMENT_PROVIDER;
    } else {
      process.env.PAYMENT_PROVIDER = original;
    }
  });

  it("defaults to asaas when PAYMENT_PROVIDER is unset", () => {
    delete process.env.PAYMENT_PROVIDER;
    expect(getPaymentProvider()).toBe("asaas");
    expect(createPaymentGateway()).toBeInstanceOf(AsaasGateway);
  });

  it("returns MercadoPagoGateway when PAYMENT_PROVIDER=mercadopago", () => {
    process.env.PAYMENT_PROVIDER = "mercadopago";
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST_ACCESS_TOKEN";
    expect(getPaymentProvider()).toBe("mercadopago");
    expect(createPaymentGateway()).toBeInstanceOf(MercadoPagoGateway);
  });

  it("returns InfinitePayGateway when PAYMENT_PROVIDER=infinitepay", () => {
    process.env.PAYMENT_PROVIDER = "infinitepay";
    process.env.INFINITEPAY_HANDLE = "aprendizbay";
    expect(getPaymentProvider()).toBe("infinitepay");
    expect(createPaymentGateway()).toBeInstanceOf(InfinitePayGateway);
  });

  it("falls back to asaas for unknown values", () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(getPaymentProvider()).toBe("asaas");
  });
});
