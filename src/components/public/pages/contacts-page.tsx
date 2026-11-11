"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { useSettings } from "@/hooks/use-data";
import { localized } from "@/lib/domain/types";
import { fmt, formatCoordinate } from "@/lib/i18n";
import { cn, formatPhone, instagramHandle, whatsappLink } from "@/lib/utils";
import { useLocale } from "../locale-context";
import { buttonClass, Container, PageIntro } from "../ui";

const MESSAGE_MAX = 600;

const schema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(80, "messageTooLong"),
  phone: z.string().trim().max(30, "messageTooLong"),
  message: z.string().trim().min(1, "messageRequired").max(MESSAGE_MAX, "messageTooLong"),
});
type Values = z.infer<typeof schema>;

export function ContactsPage() {
  const { locale, t } = useLocale();
  const { data: settings } = useSettings();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", message: "" } });

  const message = (key: string | undefined) =>
    key ? fmt(t.contacts[key as "nameRequired" | "messageRequired" | "messageTooLong"] ?? key, { max: MESSAGE_MAX }) : null;

  const onSubmit = (values: Values) => {
    if (!settings) return;
    const lines = [
      fmt(t.contacts.greeting, { name: values.name }),
      values.message,
      values.phone ? fmt(t.contacts.phoneLine, { phone: values.phone }) : "",
    ].filter(Boolean);
    window.open(whatsappLink(settings.whatsapp, lines.join("\n\n")), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  const field =
    "mt-2 w-full border-b border-espresso/25 bg-transparent py-3 text-[1rem] outline-none transition-colors placeholder:text-muted focus:border-espresso aria-[invalid=true]:border-error";

  return (
    <>
      <PageIntro title={t.contacts.title} lead={t.contacts.lead} />
      <Container className="grid gap-20 py-20 lg:grid-cols-12 lg:gap-6 lg:py-28">
        <div className="space-y-14 lg:col-span-6">
          <div>
            <p className="text-xs text-muted">{t.contacts.whatsappLabel}</p>
            {settings ? (
              <a
                href={whatsappLink(settings.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-none tabular-nums transition-colors hover:text-bronze"
              >
                {formatPhone(settings.whatsapp)}
              </a>
            ) : (
              <div className="skeleton mt-3 h-14 w-3/4" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted">{t.contacts.instagramLabel}</p>
            {settings ? (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all font-display text-[clamp(1.8rem,3.6vw,3.25rem)] leading-tight transition-colors hover:text-bronze"
              >
                {instagramHandle(settings.instagram)}
              </a>
            ) : (
              <div className="skeleton mt-3 h-12 w-2/3" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted">{t.contacts.citiesLabel}</p>
            <ul className="mt-3 grid gap-6 sm:grid-cols-2">
              {settings?.cities.map((city) => (
                <li key={city.id}>
                  <p className="font-display text-4xl">{localized(city.name, locale)}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted">
                    {formatCoordinate(city.latitude, "lat")}, {formatCoordinate(city.longitude, "lon")}
                  </p>
                  {localized(city.note, locale) && (
                    <p className="mt-2 text-sm text-espresso/70">{localized(city.note, locale)}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="bg-stone p-6 sm:p-10 lg:col-span-5 lg:col-start-8"
          aria-labelledby="contact-form-title"
        >
          <h2 id="contact-form-title" className="font-display text-4xl leading-none">
            {t.contacts.formTitle}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-espresso/65">{t.contacts.formText}</p>

          <div className="mt-8 space-y-7">
            <label className="block">
              <span className="text-sm font-medium">{t.contacts.name}</span>
              <input
                {...register("name")}
                autoComplete="name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={field}
              />
              {errors.name && (
                <span id="name-error" className="mt-2 block text-sm text-error">
                  {message(errors.name.message)}
                </span>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t.contacts.phone}</span>
              <input {...register("phone")} type="tel" autoComplete="tel" inputMode="tel" className={field} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t.contacts.message}</span>
              <textarea
                {...register("message")}
                rows={4}
                placeholder={t.contacts.messagePlaceholder}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "message-error" : undefined}
                className={cn(field, "resize-y")}
              />
              {errors.message && (
                <span id="message-error" className="mt-2 block text-sm text-error">
                  {message(errors.message.message)}
                </span>
              )}
            </label>
          </div>

          <button type="submit" disabled={!settings} className={cn(buttonClass("solid"), "mt-10 w-full sm:w-auto")}>
            {t.contacts.submit}
          </button>
          <p role="status" className="mt-4 min-h-5 text-sm text-success">
            {sent ? t.contacts.opened : ""}
          </p>
        </form>
      </Container>
    </>
  );
}
