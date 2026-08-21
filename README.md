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

## ☁️ Dados na nuvem (Firebase) — obrigatório

O app sempre roda em modo nuvem: login/cadastro usam **Firebase Auth** e cada
usuário tem um *snapshot* JSON do seu estado no **Firestore**, sincronizado
entre aparelhos (upsert com debounce a cada alteração, listener em tempo real
para mudanças feitas em outra máquina).

1. **Crie um projeto grátis** em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative **Authentication → Sign-in method → E-mail/senha**.
3. Ative **Firestore Database** (modo produção).
4. Faça o deploy das regras de acesso versionadas em [`firestore.rules`](./firestore.rules)
   — elas são o que garante que um usuário não lê/escreve o snapshot de outro:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules --project SEU-PROJETO
   ```
5. Copie `.env.example` para `.env` e preencha com os valores de
   **Configurações do projeto → Geral → Seus apps → Config do SDK**.
6. `npm run dev`.

Para publicar (Vercel/Netlify), defina as mesmas variáveis `VITE_FIREBASE_*` no
painel do provedor — sem elas o app recusa subir (ver `lib/firebase.ts`).

## 🗄️ Modelo de dados

Hoje: um documento por usuário em `kronos_snapshots/{uid}` no Firestore
(`lib/cloud.ts`), protegido por `firestore.rules`. Os tipos em `lib/types.ts`
também espelham um schema Postgres normalizado em
[`supabase/schema.sql`](./supabase/schema.sql) — **não usado pelo app**, mantido
como referência de design para uma futura migração a dados relacionais quando o
volume por usuário justificar (consultas/relatórios que um documento único não
resolve bem bem).

## ✅ Testes

```bash
npm test        # roda a suíte uma vez (Vitest)
npm run test:watch
```

A suíte cobre o motor de dívidas (`lib/divida.ts`): juros, pagamento mínimo,
sistema Price, simulação de estratégias de quitação (Avalanche × Bola de Neve)
e os casos de borda mais prováveis de quebrar em produção (divisão por zero,
orçamento que não cobre nem os juros). CI (`.github/workflows/ci.yml`) roda
type-check + testes + build em cada push/PR.

## 📁 Estrutura

```
index.html · vite.config.ts · vitest.config.ts · firestore.rules · firebase.json
src/
  main.tsx · App.tsx · index.css
  pages/       Login, Cadastro, Dashboard, Transacoes, NotasFiscais,
               Viabilidade, Impostos, Investimentos, Relatorios, Settings
components/     ui, motion (CSS), Charts (SVG), Tabs, AppShell, AuthLayout, ThemeToggle
lib/           types, utils (cálculos), store (Context+useReducer), cloud (Firebase),
               firebase, format, seed, divida (+ divida.test.ts)
supabase/      schema.sql (referência — Postgres normalizado, não usado em produção)
```

## ⚡ O que mudou para ficar rápido

- **Next.js → Vite**: sem compilação sob demanda; dev server sobe em ~2s.
- **recharts → SVG próprio**: gráficos leves com tooltip no hover.
- **framer-motion → CSS**: animações via keyframes + `requestAnimationFrame` (contadores).
- Bundle único e enxuto, `prefers-reduced-motion` respeitado.

> MVP: tabelas fiscais 2024/2025 hardcoded, sem integrações externas de
> pagamento/contabilidade. Autenticação e isolamento de dados por usuário são
> reais (Firebase Auth + Firestore Security Rules), não simulados.
