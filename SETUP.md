# Configuração da API do Last.fm

## Problema Identificado
A capa do álbum não está sendo exibida porque:
1. O arquivo temporário da capa do Chrome não existe (`/tmp/.com.google.Chrome.swBrNW`)
2. A chave da API do Last.fm não está configurada para fazer fallback

## Solução

### 1. Instalar dependência
```bash
pip install -r requirements.txt
```

### 2. Criar arquivo .env
Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```bash
# Last.fm API Configuration
# Get your free API key from: https://www.last.fm/api/account/create
LASTFM_API_KEY=sua_chave_aqui

# Optional: Set to 'true' to enable debug logging
DEBUG=false
```

### 3. Obter chave da API do Last.fm
1. Acesse: https://www.last.fm/api/account/create
2. Crie uma conta gratuita se não tiver
3. Crie uma nova aplicação
4. Copie a API Key
5. Cole no arquivo `.env` substituindo `sua_chave_aqui`

### 4. Reiniciar a aplicação
```bash
# Pare a aplicação atual (Ctrl+C)
# Depois execute:
python app.py
```

## Como funciona agora
1. A aplicação tenta carregar a capa do arquivo local (MPRIS)
2. Se o arquivo não existir, automaticamente faz fallback para Last.fm
3. A capa será exibida corretamente

## Exemplo de arquivo .env
```
LASTFM_API_KEY=1234567890abcdef1234567890abcdef
DEBUG=false
```
