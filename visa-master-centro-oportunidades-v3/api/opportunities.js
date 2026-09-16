const VIEW = "vm_opportunity_center_app_view";
const MATCHES = "vm_client_appointment_matches";

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function authorized(req) {
  const expected = process.env.VM_DASHBOARD_TOKEN;
  if (!expected) return false;
  const received = req.headers["x-dashboard-token"];
  return typeof received === "string" && received === expected;
}

async function supabase(path, options = {}) {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || data?.hint || `Supabase error ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({error:"Clave interna incorrecta o no configurada."});
  }

  try {
    if (req.method === "GET") {
      const rows = await supabase(
        `${VIEW}?select=*&order=ais_verified.desc,opportunity_date.asc,priority.asc`
      );
      return res.status(200).json({rows});
    }

    if (req.method === "PATCH") {
      const {opportunity_id, action} = req.body || {};
      if (!opportunity_id || !action) {
        return res.status(400).json({error:"Faltan opportunity_id o action."});
      }

      const now = new Date().toISOString();
      let patch;

      switch (action) {
        case "review":
          patch = {reviewed_at:now};
          break;
        case "notify":
          patch = {notified_at:now, reviewed_at:now};
          break;
        case "use":
          patch = {used_at:now, reviewed_at:now};
          break;
        case "discard":
          patch = {discarded_at:now};
          break;
        case "reopen":
          patch = {discarded_at:null};
          break;
        default:
          return res.status(400).json({error:"Acción no válida."});
      }

      const updated = await supabase(
        `${MATCHES}?id=eq.${encodeURIComponent(opportunity_id)}`,
        {
          method:"PATCH",
          headers:{Prefer:"return=representation"},
          body:JSON.stringify(patch)
        }
      );

      return res.status(200).json({ok:true, row:updated?.[0] || null});
    }

    res.setHeader("Allow","GET, PATCH");
    return res.status(405).json({error:"Método no permitido."});
  } catch (err) {
    console.error(err);
    return res.status(500).json({error:err.message || "Error interno."});
  }
}
