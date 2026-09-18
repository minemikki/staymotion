// CSS for det visuelle laget. Arver farger og typografi fra forsiden;
// legger bare til det heroen og fotostripa trenger.
module.exports = `
.lp-hero{padding:clamp(64px,9vw,116px) 0 clamp(48px,6vw,72px)}
.lp-hero .wrap{max-width:760px}
.lp-hero h1{max-width:16ch}

/* ---- ekte stemningsbilde rett under heroen, i stedet for en tegnet mockup.
   Fungerer som en kort introduksjon før den mørkere problem-seksjonen. ---- */
.foto-band{padding:0 0 clamp(56px,7vw,88px)}
.foto-band-inner{display:grid;gap:22px}
.foto-band-img{width:100%;height:auto;aspect-ratio:1100/506;object-fit:cover;border-radius:20px;border:1px solid var(--line);display:block}
.foto-poeng{font-size:clamp(17px,2vw,20px);line-height:1.5;letter-spacing:-.01em;color:var(--ink);max-width:56ch}
.foto-tekst{margin-top:8px;font-size:12.5px;color:var(--faint)}
@media(min-width:900px){
  .foto-band-inner{grid-template-columns:1.3fr 1fr;align-items:center;gap:48px}
}

/* ---- bildet gjentas i liten skala i løsningsseksjonen ---- */
.lp-sec .sec-visual{margin:0 0 36px;border-radius:16px;overflow:hidden;border:1px solid var(--line)}
`;
