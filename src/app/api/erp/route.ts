import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const appsScriptUrl = process.env.JAEGER_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    return NextResponse.json(
      { ok: false, msg: "JAEGER_APPS_SCRIPT_URL no esta configurado en Vercel." },
      { status: 500 }
    );
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, msg: "Solicitud invalida." }, { status: 400 });
  }

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...payload,
      token: process.env.JAEGER_API_TOKEN || ""
    }),
    cache: "no-store"
  });

  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.ok ? 200 : 502 });
  } catch {
    return NextResponse.json(
      { ok: false, msg: "Apps Script no devolvio JSON valido.", raw: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
