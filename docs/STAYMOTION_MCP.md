# StayMotion MCP

En liten MCP-server som lar Claude styre bestillingene direkte: se nye ordre,
hente kundens bilde-URLer, sette status og svare kunden — så videoproduksjon
kan skje uten manuell nedlasting.

**Endepunkt:** `https://<ditt-domene>/api/mcp`

## Verktøy
| Verktøy | Hva det gjør |
|---|---|
| `list_new_orders` | Betalte ordre som venter på video (nyeste først) |
| `list_orders` | Alle ordre, evt. filtrert på status |
| `get_order` | Full info + **direkte bilde-URLer** + samtale |
| `set_status` | Sett status kunden ser: `ubehandlet` / `under_arbeid` / `behandlet` |
| `reply_to_customer` | Melding til kunden (Min side + e-post) |

## Oppsett (én gang)

### 1) Lag en hemmelig nøkkel og legg den i Vercel
Generer en tilfeldig streng (f.eks. i terminal: `openssl rand -hex 32`).
I Vercel → Project → **Settings → Environment Variables**, legg til:

```
MCP_TOKEN = <den tilfeldige strengen>
```

Redeploy så variabelen blir aktiv. **Nøkkelen skal aldri limes i chat eller kode** — kun her i Vercel og i connector-innstillingen under.

### 2) Koble til Claude (custom connector)
På claude.ai → **Settings → Connectors → Add custom connector**:
- URL: `https://<ditt-domene>/api/mcp`
- Auth: Bearer token → lim inn samme `MCP_TOKEN`

(Custom connectors krever Pro/Team-plan.)

### 3) Test
Spør Claude: «list_new_orders» → du skal få de betalte ordrene som venter.

## Sikkerhet
- All tilgang krever `Authorization: Bearer <MCP_TOKEN>`.
- Serveren er read/write på ordre (status + meldinger) men kan **ikke** slette
  eller endre betaling.
- Uten `MCP_TOKEN` satt svarer endepunktet 503 (avslått).
