# ⏳ Kronos — Gestão Financeira & Desendividamento

Plataforma SaaS que ajuda o brasileiro a **sair do vermelho** e dominar o próprio dinheiro.
Com ~80% das famílias endividadas, o Kronos atende **quatro públicos** com a mesma base:

| Perfil | Quem é | Foco de dívida |
|--------|--------|----------------|
| **Pessoa física** | CPF, assalariado, família | Cartão, cheque especial, crediário, consignado, financiamento |
| **Autônomo / MEI** | Profissional PJ que mistura contas PF e PJ | Cartão, capital de giro, antecipação de recebíveis |
| **Pequena empresa** | Comércio/serviço com CNPJ | Fornecedores, folha, impostos atrasados, capital de giro |
| **Empresa** | Média/grande | Dívida estruturada, alavancagem, Dívida/EBITDA |

O usuário escolhe o perfil no cadastro e o produto se adapta (teto de comprometimento,
tipos de dívida sugeridos e recomendações). **React 19 + Vite + TypeScript (strict) + Tailwind + React Router.**

> ⚡ Migrado de Next.js para **Vite** para dev quase instantâneo (ready em ~2s, HMR imediato).
> Gráficos em **SVG próprio** e animações em **CSS** — sem recharts nem framer-motion — bundle pequeno (~134 KB gzip) e render rápido.

Identidade visual autoral inspirada em **Kronos, o deus grego do tempo**: emblema de
ampulheta, anéis orbitais, o meandro grego (a "grega") e um relógio ao vivo no topo.
Tipografia editorial-financeira: **Spectral** (títulos), **IBM Plex Sans** (interface)
e **IBM Plex Mono** para todos os números — precisão de "terminal financeiro".

## ✨ Módulos

| Rota | Módulo |
|------|--------|
| `/cadastro` · `/login` | Autenticação com **seletor de perfil** (PF/PJ/pequena/empresa) + renda/faturamento |
| `/copiloto` | **Kairós — Copiloto Financeiro**: motor de decisão que cruza dívidas + caixa + perfil e devolve a **próxima melhor ação** priorizada por impacto em R$, com feed de insights |
| `/dividas` | **Central de Dívidas** — total devedor, comprometimento de renda, índice de saúde, estratégias **Avalanche × Bola de Neve**, cronograma de quitação, **Jornada de Liberdade** (marcos + conquistas gamificadas), **Trocas inteligentes** de crédito (CET/economia) e **simulador de renegociação/portabilidade** |
| `/dashboard` | KPIs animados + **seletor de período** (dia/semana/mês/ano), **card de saúde de dívidas**, fluxo de caixa, receita×despesa, despesa por categoria, alertas |
| `/transacoes` | CRUD, filtros, **ordenação por coluna**, status pago/pendente |
| `/notas-fiscais` | Recibo/NFS-e com ISS/IRRF, assinatura digital, QR, impressão (PDF) |
| `/viabilidade` | Break-even, cenários, análise de meta |
| `/impostos` | MEI, Simples Nacional, IRPF, retenção IRRF, histórico |
| `/investimentos` | Juros compostos, **Poupança×CDB×Tesouro**, financiamento, inflação, consórcio |
| `/relatorios` | DRE, fluxo de caixa, exportação CSV |
| `/settings` | Logo, dados do negócio, regime, plano |

### 🧠 Análises Avançadas (11 módulos + simulador)

| Rota | Análise |
|------|---------|
| `/analises/previsao` | Previsão de fluxo (90 dias) com **intervalo de confiança** e alertas |
| `/analises/benchmarking` | Você × mediana × top 20% (tabela + **radar**) |
| `/analises/estilo-vida` | Retiradas do dono vs lucro, **waterfall** até o equilíbrio |
| `/analises/capital-giro` | Ciclo de caixa detectado + soluções |
| `/analises/detectar-fuga` | Anomalias de despesa, economia potencial, dificuldade |
| `/analises/otimizar-preco` | 4 cenários + **curva de lucro × preço** (ponto ótimo) |
| `/analises/mix-servicos` | **Pareto 80/20** dos serviços (classe A/B/C) |
| `/analises/roi` | Payback, ROI, **VPL, TIR**, sensibilidade, vs CDB |
| `/analises/variance` | Ponte do lucro (efeito receita × despesa) + drilldown |
| `/analises/decisao` | **Scatter** risco × retorno + simulação 12 meses |
| `/analises/vieses` | Vieses cognitivos (recência, otimismo, confirmação…) |
| `/analises/simulador` | Simulador estratégico: compõe, salva e compara cenários |

> Cálculos 100% em TypeScript (regressão+sazonalidade, elasticidade, VPL/TIR, Pareto, variance). Sem dados de exemplo — o usuário preenche. Integração com **Claude API** prevista para refinar previsão, detecção de fuga e vieses. Novas tabelas (`analises`, `despesas_pessoais`, `cenarios`) já no [`schema.sql`](./supabase/schema.sql) com RLS.

## 🚀 Rodando

```bash
npm install
npm run dev       # http://localhost:5173  → /cadastro
npm run build     # tsc --noEmit && vite build  (saída em dist/)
npm run preview   # serve o build
```

A conta nova começa **vazia** — sem dados de exemplo. Só categorias genéricas
(Serviços, Produtos, Aluguel, Salários…) ficam disponíveis nos formulários; você
lança seus próprios números.

## ☁️ Dados na nuvem — acessar de qualquer máquina (Supabase)

O app roda **local por padrão** (localStorage). Para sincronizar entre máquinas,
basta configurar o Supabase — **sem trocar código**, é só variável de ambiente:

1. **Crie um projeto grátis** em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e rode [`supabase/schema.sql`](./supabase/schema.sql)
   (cria a tabela `kronos_snapshots` com RLS — cada usuário só vê o próprio dado).
3. Em **Authentication → Providers**, mantenha **Email** ligado. Para testes,
   desligue "Confirm email" (assim o login já entra sem confirmar).
4. Copie `.env.example` para `.env` e preencha com **Project Settings → API**:
   ```bash
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```
5. `npm run dev`. Pronto: cadastro/login agora usam **Supabase Auth** e os dados
   sobem para a nuvem. Entre com o mesmo e-mail/senha em **qualquer máquina** e
   tudo aparece.

**Como funciona:** [`lib/supabase.ts`](./lib/supabase.ts) detecta as variáveis e liga
o modo nuvem; [`lib/cloud.ts`](./lib/cloud.ts) faz login/cadastro e salva um
*snapshot* JSON do estado por usuário (upsert com debounce a cada alteração) e o
carrega no login. Sem as variáveis, cai automaticamente no localStorage — nada quebra.
Para publicar (Vercel/Netlify), defina as duas variáveis no painel do provedor.

## 🗄️ Banco de dados (schema normalizado)

O MVP persiste em `localStorage`, mas os tipos (`lib/types.ts`) espelham o schema
Postgres em [`supabase/schema.sql`](./supabase/schema.sql) — tabelas, índices,
**Row Level Security** por usuário e trigger de seed. Para migrar: crie um projeto
no Supabase, rode o SQL e troque `lib/storage.ts` pelo cliente `@supabase/supabase-js`.

## 📁 Estrutura

```
index.html · vite.config.ts
src/
  main.tsx · App.tsx · index.css
  pages/       Login, Cadastro, Dashboard, Transacoes, NotasFiscais,
               Viabilidade, Impostos, Investimentos, Relatorios, Settings
components/     ui, motion (CSS), Charts (SVG), Tabs, AppShell, AuthLayout, ThemeToggle
lib/           types, utils (cálculos), store (Context+useReducer), storage, format, seed
supabase/      schema.sql (Postgres + RLS)
```

## ⚡ O que mudou para ficar rápido

- **Next.js → Vite**: sem compilação sob demanda; dev server sobe em ~2s.
- **recharts → SVG próprio**: gráficos leves com tooltip no hover.
- **framer-motion → CSS**: animações via keyframes + `requestAnimationFrame` (contadores).
- Bundle único e enxuto, `prefers-reduced-motion` respeitado.

> MVP sem autenticação real nem integrações externas. Tabelas fiscais 2024/2025 hardcoded.
