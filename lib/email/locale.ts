/** BCP 47 locale for transactional email (HTML lang + Content-Language header). */
export const EMAIL_LOCALE = String(process.env.EMAIL_LOCALE ?? "pt-BR").trim() || "pt-BR";

/** HTML `lang` attribute value for email documents. */
export const EMAIL_HTML_LANG = EMAIL_LOCALE;
