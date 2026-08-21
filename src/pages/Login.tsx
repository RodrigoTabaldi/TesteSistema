import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Emblem } from "@/components/ui";
import { Eye, EyeOff } from "lucide-react";

interface FormData {
  email: string;
  senha: string;
}

export default function Login() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  async function onSubmit(data: FormData) {
    setErro(null);
    const res = await login(data.email, data.senha);
    if (!res.ok) {
      setErro(res.error ?? "Falha no login.");
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

      <h1 className="font-serif-display text-[26px] font-bold">Bem-vindo de volta</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Entre para continuar cuidando do seu tempo e dinheiro.</p>

      {erro && (
        <div className="mt-4 rounded-md border border-crit/40 bg-[color-mix(in_srgb,var(--crit)_12%,transparent)] px-3.5 py-2.5 text-[13px] text-crit" role="alert">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
        <Field label="E-mail" required error={errors.email?.message}>
          <Input type="email" placeholder="voce@negocio.com" autoComplete="email" {...register("email", { required: "Informe o e-mail" })} />
        </Field>
        <Field label="Senha" required error={errors.senha?.message}>
          <div className="relative">
            <Input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("senha", { required: "Informe a senha" })}
            />
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

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full py-3">
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13.5px] text-fg-muted">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-semibold text-blue-lift hover:underline">
          Cadastre-se grátis
        </Link>
      </p>
    </div>
  );
}
