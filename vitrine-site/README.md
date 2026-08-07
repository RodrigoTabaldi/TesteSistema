# Vitrine Software — Site institucional

Recriação do site da TOTVS (totvs.com) adaptada para a **Vitrine Software**, empresa
de desenvolvimento de sistemas, seguindo a identidade visual oficial da **Família Vitrine**.

## Identidade aplicada

| Token | Valor | Uso |
|-------|-------|-----|
| Navy | `#101828` | Marca, fundos escuros, títulos |
| Azul | `#2E5BFF` | Cor de destaque, botões, links |
| Azul claro | `#5B7BFF` | Texto azul sobre fundo escuro |
| Slate | `#5A6472` | Textos de apoio |
| Nuvem | `#F5F7FA` | Fundos claros de seção |
| Branco | `#FFFFFF` | Base |

- **Tipografia:** Poppins (títulos e marca) · Inter (texto e interface)
- **Símbolo:** direção `1A · Código conectado` — o código (`</>`) no lugar do globo,
  encapsulado no anel navy, com dois nós conectados e a barra como único elemento azul.
- **Assinatura:** `vitrine software` em caixa baixa.

## Estrutura (inspirada no totvs.com)

Top bar · Header com mega-menu · Hero com janela de código · Marquee de stack ·
Soluções (6 cards) · Diferenciais · Processo/painel · Segmentos · Números animados ·
Depoimentos · CTA · Formulário de contato · Footer completo.

## Como rodar

É um site estático — sem build. Basta abrir `index.html` ou servir a pasta:

```bash
cd vitrine-site
python3 -m http.server 8080
# acesse http://localhost:8080
```

## Arquivos

```
vitrine-site/
├── index.html          # Página completa
├── assets/
│   ├── styles.css      # Design system (paleta + Poppins/Inter)
│   ├── main.js         # Menu mobile, reveal, contadores, form
│   ├── symbol.svg      # Símbolo da marca (código no anel)
│   └── favicon.svg     # Favicon
└── README.md
```
