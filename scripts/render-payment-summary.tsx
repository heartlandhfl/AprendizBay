import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BookingPaymentSummary from "../components/bookings/BookingPaymentSummary";

const studentHtml = renderToStaticMarkup(
  <BookingPaymentSummary price={80} platformFee={8} tutorAmount={72} />,
);
const tutorHtml = renderToStaticMarkup(
  <BookingPaymentSummary
    price={80}
    platformFee={8}
    tutorAmount={72}
    variant="tutor"
  />,
);

const studentRequired = [
  "Resumo do pagamento",
  "Valor da aula",
  "Valor do professor",
  "Taxa da plataforma",
  "Total a pagar",
  "R$",
  "80",
  "72",
  "8",
];

for (const snippet of studentRequired) {
  if (!studentHtml.includes(snippet)) {
    throw new Error(`Student payment summary HTML is missing: ${snippet}\n${studentHtml}`);
  }
}

if (!tutorHtml.includes("Você recebe") || tutorHtml.includes("Total a pagar")) {
  throw new Error(`Tutor payment summary HTML is incorrect:\n${tutorHtml}`);
}

console.log(studentHtml);
console.log(tutorHtml);
console.log("payment summary render check passed");
