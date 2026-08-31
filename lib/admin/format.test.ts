import { describe, expect, it } from "vitest";
import { formatAdminCount, formatAdminMoney, UNAVAILABLE_LABEL } from "@/lib/admin/format";

describe("admin metric formatting", () => {
  it("formats available counts and money in pt-BR", () => {
    expect(formatAdminCount({ available: true, value: 12 })).toBe("12");
    expect(formatAdminMoney({ available: true, value: 150 })).toBe(
      (150).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    );
  });

  it("never substitutes a number when the metric is unavailable", () => {
    expect(formatAdminCount({ available: false })).toBe(UNAVAILABLE_LABEL);
    expect(formatAdminMoney({ available: false })).toBe(UNAVAILABLE_LABEL);
    expect(UNAVAILABLE_LABEL).toBe("Indisponível");
  });
});
