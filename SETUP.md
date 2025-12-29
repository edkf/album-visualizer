# Configuração do Album Visualizer para macOS

## Pré-requisitos

### 1. Instalar media-control
O projeto usa `media-control` para detectar música tocando no macOS:

```bash
brew install media-control
```

Verifique se está funcionando:
```bash
media-control get
```

### 2. Instalar Node.js
Certifique-se de ter Node.js 16+ instalado:

```bash
node --version
```

Se não tiver, instale via Homebrew:
```bash
brew install node
```

### 3. Instalar dependências do projeto
```bash
npm install
```

## Configuração da API do Last.fm (Opcional)

A capa do álbum é obtida diretamente do `media-control`, mas se não estiver disponível, o sistema faz fallback para a API do Last.fm.

### 1. Criar arquivo .env
Crie um arquivo `.env` na raiz do projeto:

```bash
# Last.fm API Configuration
# Get your free API key from: https://www.last.fm/api/account/create
LASTFM_API_KEY=sua_chave_aqui

# Optional: Server port (default: 5000)
PORT=5000
```

### 2. Obter chave da API do Last.fm
1. Acesse: https://www.last.fm/api/account/create
2. Crie uma conta gratuita se não tiver
3. Crie uma nova aplicação
4. Copie a API Key
5. Cole no arquivo `.env` substituindo `sua_chave_aqui`

## Como executar

### Modo produção:
```bash
npm start
```

### Modo desenvolvimento (com auto-reload):
```bash
npm run dev
```

Depois acesse: `http://localhost:5000`

## Como funciona

1. A aplicação usa `media-control get` para obter informações da música tocando
2. A capa do álbum é extraída do `artworkData` (base64) fornecido pelo media-control
3. Se a capa não estiver disponível e a API do Last.fm estiver configurada, faz fallback
4. As cores são extraídas da capa e aplicadas ao fundo da interface

## Exemplo de arquivo .env
```
LASTFM_API_KEY=1234567890abcdef1234567890abcdef
PORT=5000
```

## Troubleshooting

### media-control não encontrado
```bash
# Verifique se está instalado
which media-control

# Se não estiver, instale novamente
brew install media-control
```

### Música não detectada
- Certifique-se de que há música tocando
- Teste manualmente: `media-control get`
- Verifique se o player está suportado pelo media-control

### Capa não aparece
- Verifique se o `.env` está configurado corretamente
- Teste a API do Last.fm manualmente
- Verifique os logs do servidor para erros
