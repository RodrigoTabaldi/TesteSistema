import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User as UserIcon, Briefcase, Store, Building2, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Select, Emblem } from "@/components/ui";
import { validaDocumento, validaEmail } from "@/lib/utils";
import { PERFIS } from "@/lib/divida";
import { parseReaisToCentavos } from "@/lib/format";
import type { Perfil } from "@/lib/types";

const schema = z
  .object({
    perfil: z.enum(["pf", "pj", "pequena", "empresa"]),
    nome_negocio: z.string().min(2, "Informe seu nome ou o do negócio"),
    documento: z.string().refine((d) => validaDocumento(d), "CPF ou CNPJ inválido"),
    regime: z.enum(["mei", "simples", "presumido", "real"]),
    renda: z.string().refine((r) => parseReaisToCentavos(r) > 0, "Informe um valor"),
    email: z.string().refine((e) => validaEmail(e), "E-mail inválido"),
    senha: z.string().min(6, "Mínimo de 6 caracteres"),
    confirma: z.string(),
  })
  .refine((d) => d.senha === d.confirma, { path: ["confirma"], message: "As senhas não conferem" });

type FormData = z.infer<typeof schema>;

const PERFIL_CARDS: { id: Perfil; icon: typeof UserIcon }[] = [
  { id: "pf", icon: UserIcon },
  { id: "pj", icon: Briefcase },
  { id: "pequena", icon: Store },
  { id: "empresa", icon: Building2 },
];

export default function Cadastro() {
  const { register: registerUser } = useStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { regime: "mei", perfil: "pf" },
  });

  const perfil = watch("perfil");
  const perfilMeta = PERFIS[perfil];

  async function onSubmit(data: FormData) {
    setErroGeral(null);
    setAviso(null);
    const res = await registerUser({
      email: data.email,
      senha: data.senha,
      nome_negocio: data.nome_negocio,
      documento: data.documento,
      perfil: data.perfil,
      regime: data.regime,
      renda_mensal_centavos: parseReaisToCentavos(data.renda),
    });
    if (!res.ok) {
      setErroGeral(res.error ?? "Não foi possível cadastrar.");
      return;
    }
    if (res.aviso) {
      // Confirmação de e-mail pendente (modo nuvem) — não navega ainda.
      setAviso(res.aviso);
      return;
    }
    navigate("/dashboard", { replace: true });
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 lg:hidden">
        <Emblem size={36} />
        <span className="font-serif-display text-[20px] font-bold uppercase tracking-[3px]">
          Kro<span className="text-gold">nos</span>
        </span>
      </div>

      <h1 className="font-serif-display text-[26px] font-bold">Crie sua conta</h1>
      <p className="mt-1 text-[14px] text-fg-muted">
        Comece grátis. Sua conta nasce vazia — sem dados fictícios. Você escolhe seu perfil e o Kronos se adapta.
      </p>

      {erroGeral && (
        <div className="mt-4 rounded-md border border-crit/40 bg-[color-mix(in_srgb,var(--crit)_12%,transparent)] px-3.5 py-2.5 text-[13px] text-crit" role="alert">
          {erroGeral}
        </div>
      )}
      {aviso && (
        <div className="mt-4 rounded-md border border-blue/40 bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] px-3.5 py-2.5 text-[13px] text-blue-lift" role="status">
          {aviso}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
        {/* Seletor de perfil */}
        <div>
          <span className="mb-2 block text-[12.5px] font-medium text-fg-muted">Qual é o seu perfil? <span className="text-crit">*</span></span>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PERFIL_CARDS.map(({ id, icon: Icon }) => {
              const active = perfil === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setValue("perfil", id, { shouldValidate: true })}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition ${
                    active ? "border-blue bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] shadow-kronos" : "border-line hover:border-[color:var(--ring)] hover:bg-surface-2"
                  }`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${active ? "bg-blue text-white" : "bg-surface-2 text-fg-muted"}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`text-[12px] font-semibold leading-tight ${active ? "text-fg" : "text-fg-muted"}`}>{PERFIS[id].label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11.5px] text-fg-dim">{perfilMeta.tagline}</p>
        </div>

        <Field label={perfil === "pf" ? "Seu nome" : "Nome do negócio"} required error={errors.nome_negocio?.message}>
          <Input placeholder={perfil === "pf" ? "Ana Souza" : "Barbearia Aurora"} autoComplete={perfil === "pf" ? "name" : "organization"} {...register("nome_negocio")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={perfilMeta.doc === "cnpj" ? "CNPJ" : perfilMeta.doc === "cpf" ? "CPF" : "CPF ou CNPJ"} required error={errors.documento?.message}>
            <Input placeholder="000.000.000-00" inputMode="numeric" {...register("documento")} />
          </Field>
          <Field label={perfilMeta.rendaLabel} required error={errors.renda?.message} hint="Base do comprometimento com dívidas">
            <Input placeholder="R$ 0,00" inputMode="decimal" {...register("renda")} />
          </Field>
        </div>

        <Field label="Regime tributário" required error={errors.regime?.message} hint={perfil === "pf" ? "Se você é só pessoa física, deixe MEI" : undefined}>
          <Select {...register("regime")}>
            <option value="mei">MEI</option>
            <option value="simples">Simples Nacional</option>
            <option value="presumido">Lucro Presumido</option>
            <option value="real">Lucro Real</option>
          </Select>
        </Field>

        <Field label="E-mail" required error={errors.email?.message}>
          <Input type="email" placeholder="voce@email.com" autoComplete="email" {...register("email")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Senha" required error={errors.senha?.message}>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" {...register("senha")} />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-dim hover:text-fg"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar senha" required error={errors.confirma?.message}>
            <Input type={showPass ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" {...register("confirma")} />
          </Field>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full py-3">
          {isSubmitting ? "Criando..." : "Criar conta grátis"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13.5px] text-fg-muted">
        Já tem conta?{" "}
        <Link to="/login" className="font-semibold text-blue-lift hover:underline">
          Entrar
        </Link>
      </p>
      <p className="mt-4 text-center text-[11.5px] text-fg-dim">
        Autenticação e dados ficam na nuvem (Firebase), sincronizados entre seus aparelhos.
      </p>
    </div>
  );
}
