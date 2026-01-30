# 📋 Instruções de Deploy - Frontend (Vercel) + Backend (Render)

## ✅ O que foi configurado

### Frontend (Vercel)
- ✅ Sistema de configuração centralizada da API (`js/config.js`)
- ✅ Detecção automática de ambiente (produção vs desenvolvimento)
- ✅ Todos os arquivos JS atualizados para usar a configuração centralizada
- ✅ `config.js` adicionado em todas as páginas HTML

### Como funciona

O arquivo `js/config.js` detecta automaticamente:
- **Desenvolvimento**: Usa `http://localhost:8080`
- **Produção (Vercel)**: Usa `https://northern-lights-api.onrender.com`

## 🔧 Configuração no Vercel

### Passo 1: Adicionar variável de ambiente

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: **Northern-Lights-Frontend**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Configure:
   - **Key**: `API_BASE_URL`
   - **Value**: `https://northern-lights-api.onrender.com` (substitua pela URL real do seu backend no Render)
   - **Environment**: Marque todas (Production, Preview, Development)
6. Clique em **Save**

### Passo 2: Atualizar config.js (se necessário)

Se você quiser usar a variável de ambiente do Vercel diretamente, atualize `js/config.js`:

```javascript
// Adicione no início do arquivo config.js
const vercelApiUrl = window.__VERCEL_ENV_API_BASE_URL__ || null;
```

**OU** use o método mais simples: o `config.js` já detecta automaticamente o ambiente.

### Passo 3: Fazer redeploy

1. Vá em **Deployments**
2. Clique nos três pontos do último deploy
3. Selecione **Redeploy**
4. Aguarde o deploy terminar

## 🔧 Configuração do Backend (Render)

### Configurações no Render

**Nome:**
```
Northern-Lights-API
```

**Linguagem:**
```
Maven
```

**Filial:**
```
mestre (ou main, conforme seu repositório)
```

**Região:**
```
Virginia (Leste dos EUA)
```

**Diretório raiz:**
```
demo
```
⚠️ **IMPORTANTE**: O código está em `demo/`, então coloque `demo` aqui.

**Build Command:**
```
./mvnw clean package -DskipTests
```

**Start Command:**
```
java -jar -Dserver.port=$PORT target/*.jar
```
⚠️ **IMPORTANTE**: Use `$PORT` (o Render define automaticamente).

**Tipo de instância:**
```
Livre (Free)
```

### Variáveis de ambiente no Render

Adicione estas variáveis em **Environment Variables**:

```
PORT=8080
```

```
SPRING_DATASOURCE_URL=jdbc:mysql://seu-host:3306/northern_lights?createDatabaseIfNotExist=true&allowPublicKeyRetrieval=true&useSSL=true&serverTimezone=America/Sao_Paulo
```

```
SPRING_DATASOURCE_USERNAME=seu_usuario
```

```
SPRING_DATASOURCE_PASSWORD=sua_senha
```

```
JWT_SECRET=sua_chave_secreta_aqui
```

```
SPRING_PROFILES_ACTIVE=production
```

```
FILE_UPLOAD_DIR=/opt/render/project/src/uploads
```

## 🗄️ Banco de Dados MySQL no Render

1. No dashboard do Render, clique em **New +**
2. Selecione **MySQL**
3. Escolha **Free** plan
4. Configure:
   - **Name**: `northern-lights-db`
   - **Region**: `Virginia (US East)`
5. Após criar, copie a **Internal Database URL**
6. Use essa URL na variável `SPRING_DATASOURCE_URL`

## 🔒 Configurar CORS no Backend

No arquivo `SecurityConfig.java` do backend, adicione:

```java
.allowedOrigins(
    "https://northern-lights-frontend-2i36.vercel.app",
    "http://localhost:3000",  // Para desenvolvimento local
    "http://localhost:8080"   // Para desenvolvimento local
)
```

## 🚀 Próximos Passos

1. ✅ Fazer deploy do backend no Render
2. ✅ Obter a URL do backend (ex: `https://northern-lights-api.onrender.com`)
3. ✅ Configurar variável de ambiente no Vercel (opcional, o config.js já detecta)
4. ✅ Configurar CORS no backend
5. ✅ Fazer redeploy do frontend
6. ✅ Testar em produção

## 🧪 Testar

### Desenvolvimento Local
- Frontend: `http://localhost:3000` (ou porta que você usa)
- Backend: `http://localhost:8080`
- O `config.js` detecta automaticamente e usa localhost

### Produção
- Frontend: `https://northern-lights-frontend-2i36.vercel.app`
- Backend: `https://northern-lights-api.onrender.com`
- O `config.js` detecta automaticamente e usa a URL do Render

## 📝 Notas Importantes

- O `config.js` é carregado **antes** de todos os outros scripts
- Todos os arquivos JS usam `window.API` ou `window.API_BASE_URL`
- A detecção de ambiente é automática baseada no hostname
- Não é necessário modificar código para alternar entre ambientes

## 🔍 Troubleshooting

**Problema**: Frontend não conecta com backend
- Verifique se a URL do backend está correta
- Verifique CORS no backend
- Verifique os logs do console do navegador (F12)

**Problema**: Erro 404 nas requisições
- Verifique se o backend está rodando no Render
- Verifique se a URL está correta (com https://)
- Verifique os logs do Render

**Problema**: CORS error
- Configure CORS no backend para aceitar o domínio do Vercel
- Verifique se está usando HTTPS em produção


