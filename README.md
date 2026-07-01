# MOTA STORE - Agregador de Ofertas de Streaming

**MOTA STORE** é uma plataforma elegante e profissional que oferece testes gratuitos de 30 dias para as principais plataformas de streaming: Spotify Premium, Amazon Prime Video, YouTube Premium e YouTube Music.

## 🎯 Características

- **Landing Page Profissional**: Design elegante com paleta azul profundo
- **Autenticação Google**: Login seguro via OAuth
- **Listagem de Ofertas**: 4 plataformas de streaming com descrições detalhadas
- **Sistema de Carrinho**: Adicione e remova produtos do carrinho
- **Checkout Multi-etapas**: Fluxo seguro com endereço e pagamento
- **Perfil do Usuário**: Visualize seu histórico de pedidos
- **Modo Claro/Escuro**: Toggle entre temas para melhor experiência
- **Design Responsivo**: Otimizado para mobile (Android/iPhone) e desktop

## 🛠️ Tecnologias

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Express.js, tRPC, Node.js
- **Banco de Dados**: MySQL/TiDB com Drizzle ORM
- **Autenticação**: Manus OAuth
- **Deploy**: Render (configurado)

## 📦 Estrutura do Projeto

```
mota_store/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Home, Cart, Checkout, Profile)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/           # Utilitários (tRPC client)
│   │   └── index.css      # Estilos globais com paleta azul
│   └── index.html
├── server/                # Backend Express
│   ├── routers.ts         # Definição de procedimentos tRPC
│   ├── db.ts              # Queries do banco de dados
│   └── seed-products.ts   # Script para popular produtos
├── drizzle/               # Migrações e schema do banco
│   └── schema.ts          # Definição das tabelas
└── package.json
```

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 22+
- pnpm
- Banco de dados MySQL/TiDB

### Instalação

1. Clone o repositório
```bash
git clone <seu-repositorio>
cd mota_store
```

2. Instale as dependências
```bash
pnpm install
```

3. Configure as variáveis de ambiente (`.env`)
```bash
DATABASE_URL=mysql://usuario:senha@localhost:3306/mota_store
JWT_SECRET=sua-chave-secreta
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
```

4. Execute as migrações do banco
```bash
pnpm drizzle-kit generate
# Aplique as migrações via UI do Manus ou manualmente
```

5. Popule os produtos
```bash
npx tsx server/seed-products.ts
```

6. Inicie o servidor de desenvolvimento
```bash
pnpm dev
```

O site estará disponível em `http://localhost:3000`

## 📋 Páginas Disponíveis

| Página | Rota | Descrição |
|--------|------|-----------|
| Home | `/` | Landing page com listagem de ofertas |
| Carrinho | `/cart` | Visualize e gerencie itens do carrinho |
| Checkout | `/checkout` | Fluxo de compra com endereço e pagamento |
| Perfil | `/profile` | Dados do usuário e histórico de pedidos |

## 🎨 Paleta de Cores

- **Azul Primário**: `oklch(0.55 0.2 250)` - Cor principal da marca
- **Fundo Claro**: `oklch(0.96 0.01 250)` - Modo claro
- **Fundo Escuro**: `oklch(0.12 0.02 250)` - Modo escuro

## 📱 Responsividade

O site foi otimizado para:
- **Desktop**: 1280px+ (experiência completa)
- **Tablet**: 768px - 1279px (layout adaptado)
- **Mobile**: 375px - 767px (interface otimizada)

## 🔐 Segurança

- Autenticação via Google OAuth
- Senhas hasheadas no banco de dados
- Validação de entrada em todos os formulários
- HTTPS em produção

## 📦 Produtos Disponíveis

1. **Spotify Premium** - R$ 11,99/mês (30 dias grátis)
2. **Amazon Prime Video** - R$ 14,99/mês (30 dias grátis)
3. **YouTube Premium** - R$ 15,99/mês (30 dias grátis)
4. **YouTube Music Premium** - R$ 12,99/mês (30 dias grátis)

## 🚢 Deploy no Render

1. Faça push do código para GitHub
2. Conecte seu repositório ao Render
3. Configure as variáveis de ambiente
4. Deploy automático ao fazer push para `main`

## 📝 Licença

Este projeto é propriedade de MOTA STORE. Todos os direitos reservados.

## 👤 Autor

Desenvolvido com ❤️ para MOTA STORE

---

**Versão**: 1.0.0  
**Última atualização**: Julho 2026
