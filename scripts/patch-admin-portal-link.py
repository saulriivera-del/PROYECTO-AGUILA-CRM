from pathlib import Path

path = Path("app/admin/tramites/[id]/page.tsx")
text = path.read_text(encoding="utf-8")

needle = '''        <div className="header-actions">
          <Link className="secondary-button" href={`/admin/clientes/${client?.id}`}>Expediente</Link>'''

replacement = '''        <div className="header-actions">
          <Link className="secondary-button" href={`/admin/tramites/${process.id}/portal`}>Portal empresa</Link>
          <Link className="secondary-button" href={`/admin/clientes/${client?.id}`}>Expediente</Link>'''

if "Portal empresa" in text:
    print("El botón Portal empresa ya existe. No se hicieron cambios.")
elif needle not in text:
    raise SystemExit("No encontré el punto exacto para insertar el botón. No se modificó el archivo.")
else:
    path.write_text(text.replace(needle, replacement, 1), encoding="utf-8")
    print("Botón Portal empresa agregado correctamente.")
