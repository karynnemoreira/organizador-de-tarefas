import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const twilio = process.env["TWILIO_API_KEY"];
  if (!lovable || !twilio) throw new Error("Serviço de SMS não configurado.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": twilio,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export const agendarSms = createServerFn({ method: "POST" })
  .inputValidator((d: { to: string; body: string; sendAt: string }) => {
    if (!/^\+\d{10,15}$/.test(d.to)) throw new Error("Telefone inválido. Use o formato +5511999999999.");
    if (!d.body || d.body.length > 500) throw new Error("Mensagem inválida.");
    if (isNaN(Date.parse(d.sendAt))) throw new Error("Data inválida.");
    return d;
  })
  .handler(async ({ data }) => {
    const service = process.env["TWILIO_MESSAGING_SERVICE_SID"];
    if (!service) throw new Error("Falta configurar o serviço de mensagens do Twilio.");
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: headers(),
      body: new URLSearchParams({
        To: data.to,
        MessagingServiceSid: service,
        Body: data.body,
        ScheduleType: "fixed",
        SendAt: new Date(data.sendAt).toISOString(),
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Twilio [${res.status}]: ${text}`);
      throw new Error(`Falha ao agendar SMS [${res.status}]: ${text}`);
    }
    return { sid: JSON.parse(text).sid as string };
  });

export const cancelarSms = createServerFn({ method: "POST" })
  .inputValidator((d: { sid: string }) => {
    if (!/^(SM|MM)[a-f0-9]{32}$/i.test(d.sid)) throw new Error("SID inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY_URL}/Messages/${data.sid}.json`, {
      method: "POST",
      headers: headers(),
      body: new URLSearchParams({ Status: "canceled" }),
    });
    if (!res.ok) console.error(`Twilio cancel [${res.status}]: ${await res.text()}`);
    return { ok: res.ok };
  });
