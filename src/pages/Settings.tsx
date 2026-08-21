import { useRef, useState } from "react";
import { Settings as SettingsIcon, Upload, Check, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, Button, Field, Input, Select, Pill, SectionTitle } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PERFIS } from "@/lib/divida";
import { parseReaisToCentavos } from "@/lib/format";
import type { RegimeTributario, Plano, Perfil } from "@/lib/types";

export default function Settings() {
  const { state, dispatch, logout } = useStore();
  const user = state.user!;
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(user.nome_negocio);
  const [doc, setDoc] = useState(user.documento);
  const [perfil, setPerfil] = useState<Perfil>(user.perfil ?? "pf");
  const [renda, setRenda] = useState(((user.renda_mensal_centavos ?? 0) / 100).toString());
  const [regime, setRegime] = useState<RegimeTributario>(user.regime);
  const [plano, setPlano] = useState<Plano>(user.plano);
  const [logo, setLogo] = useState<string | null>(user.logo_url);
  const [salvo, setSalvo] = useState(false);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  function salvar() {
    dispatch({ type: "UPDATE_USER", patch: { nome_negocio: nome, documento: doc, perfil, regime, plano, renda_mensal_centavos: parseReaisToCentavos(renda), logo_url: logo } });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-fg-muted">
          <SettingsIcon size={22} />
        </span>
        <div>
          <h1 className="font-serif-display text-[24px] font-bold">Configurações</h1>
          <p className="text-[13px] text-fg-muted">Dados do negócio, logo e plano.</p>
        </div>
      </div>

      <SectionTitle>Identidade do negócio</SectionTitle>
      <Reveal>
        <Card className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-3">
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-serif-display text-[36px] font-bold text-gold">{nome.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => fileRef.current?.click()} className="px-3 py-2 text-[12px]"><Upload size={14} /> Logo</Button>
                {logo && <Button variant="subtle" onClick={() => setLogo(null)} className="px-3 py-2 text-[12px]"><Trash2 size={14} /></Button>}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome do negócio"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
              <Field label="CPF / CNPJ"><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>
              <Field label="Perfil">
                <Select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
                  {(Object.keys(PERFIS) as Perfil[]).map((p) => <option key={p} value={p}>{PERFIS[p].label}</option>)}
                </Select>
              </Field>
              <Field label={PERFIS[perfil].rendaLabel} hint="Base do comprometimento com dívidas">
                <Input value={renda} onChange={(e) => setRenda(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </Field>
              <Field label="Regime tributário">
                <Select value={regime} onChange={(e) => setRegime(e.target.value as RegimeTributario)}>
                  <option value="mei">MEI</option>
                  <option value="simples">Simples Nacional</option>
                  <option value="presumido">Lucro Presumido</option>
                  <option value="real">Lucro Real</option>
                </Select>
              </Field>
              <Field label="E-mail"><Input value={user.email} disabled /></Field>
            </div>
          </div>
        </Card>
      </Reveal>

      <SectionTitle>Plano</SectionTitle>
      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {([
            { id: "free", nome: "Free", preco: "R$ 0", desc: "Dashboard + transações" },
            { id: "pro", nome: "Cronos Pro", preco: "R$ 39/mês", desc: "Tudo + impostos + relatórios" },
            { id: "business", nome: "Business", preco: "R$ 89/mês", desc: "Multi-unidade + suporte" },
          ] as const).map((p) => (
            <button key={p.id} onClick={() => setPlano(p.id)} className={`rounded-lg border p-5 text-left transition ${plano === p.id ? "border-blue bg-[color-mix(in_srgb,var(--blue)_10%,transparent)]" : "border-line hover:border-[color:var(--ring)]"}`}>
              <div className="flex items-center justify-between">
                <span className="font-serif-display text-[16px] font-bold">{p.nome}</span>
                {plano === p.id && <Pill tone="info">Atual</Pill>}
              </div>
              <div className="mt-2 text-[20px] font-bold tnum">{p.preco}</div>
              <div className="mt-1 text-[12.5px] text-fg-muted">{p.desc}</div>
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={logout} className="text-crit">Sair da conta</Button>
        <Button onClick={salvar}>
          {salvo ? <><Check size={16} /> Salvo!</> : "Salvar alterações"}
        </Button>
      </div>

      <p className="mt-8 text-center text-[11.5px] text-fg-dim">
        Kronos MVP · dados no localStorage · schema Postgres pronto em <code>supabase/schema.sql</code>
      </p>
    </div>
  );
}
