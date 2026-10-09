# Limpeza do repositório "ate" pré-fase 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** higienizar o repositório (skills, dependências, assets, lixo de raiz, stack da apresentação da fase 2) antes da fase 3 (SQLite, Supabase, câmera e GPS reais), sem tocar em lógica, testes ou arquitetura de `src/`.

**Architecture:** cinco commits independentes (um por categoria), cada um revertível isoladamente, precedidos por uma tag de entrega. Nenhuma categoria altera `src/`, testes ou configuração de teste; portanto a linha de base de verificação (testes, typecheck, lint, doctor, cobertura) precisa permanecer idêntica.

**Tech Stack:** Expo ~57 / React Native 0.86 / Expo Router / Jest + jest-expo / TypeScript.

**Spec:** instruções do usuário na sessão de planejamento (categorias A–E, protocolo de segurança e linha de base). Cenário de identidade visual (ícone, splash, cores) explicitamente fora do escopo.

## Global Constraints

- Linha de base (deve continuar igual): `npm test` = 45 suítes / 214 testes; `npm run typecheck` = 0 erros; `npm run lint` = 0 erros e 11 warnings em `src/presentation/__tests__/RouterGuards.test.tsx` (intencionais — não corrigir); `npx expo-doctor` sem erro de dependência; cobertura ≈ 85,42% instruções / 88,18% linhas / 85,74% funções / 77,14% ramificações (não pode cair).
- Comandos npm rodam após `source /opt/scripts/nvm_autocomplete.sh` (node v22.20.0 / npm 10.9.3).
- Repo não tem `user.name`/`user.email` configurados: usar `git -c user.name=rmofilh -c user.email=ricardomoreira1705@gmail.com` em cada commit (identidade dos commits existentes).
- Um commit por categoria. Após cada categoria rodar `npm test`, `npm run typecheck`, `npm run lint`, `npx expo-doctor`. Se algo divergir da linha de base: reverter aquele commit (`git revert`), avisar o usuário e **não** ajustar teste/asserção para fazer passar.
- Remoção de pacotes: `npm uninstall` e depois `npx expo install --check`. Nunca `npm install` para adicionar pacotes.
- Fora do escopo (não tocar): `src/`, `docs/superpowers/`, `docs/ate-fase1.md`, `docs/ate-fase2.md`, `AGENTS.md`, `app.json`, `assets/expo.icon/`.

## Review Focus

1. **Assets referenciados dinamicamente** (`require` com template string) — removidos só depois de grep por basename em `src/`, `app.json`, `docs/` e raiz `*.md/*.js/*.json`; os únicos `require()` de `src/` apontam para fleur-de-lis SVGs e fontes.
2. **Peers do expo-router removidas por engano** — lista de "não remover" explícita na Task B; remoção só dos 4 pacotes com zero referências.
3. **Entrada morta no `eslint.config.js`** — a remoção de `docs/vendor/**` (Task E) não pode alterar a saída do lint (nenhum arquivo restante sob `docs/vendor`); verificado no próprio commit.
4. **Cobertura sem arquivo de config após a Task E** — `docs/apresentacao-coverage.cjs` é excluído; verificação final usa o equivalente via CLI (coleta continua só de `src/`, que nenhuma categoria toca).
5. **Warnings de lint "corrigidos" por acidente** — diff da saída do lint comparado à base; `RouterGuards.test.tsx` permanece intacto.

## Medições de base (antes)

- 391 arquivos rastreados; 8,2M de conteúdo rastreado; working tree (sem `node_modules`, `.git`, `.expo`) = 8,6M; `.git` = 3,3M.

---

### Task 0: Tag de entrega e linha de base verificada

**Files:** nenhum (só tag).

- [ ] **Step 1: Criar a tag**

```bash
git tag fase2-entrega
```

- [ ] **Step 2: Rodar a linha base completa**

```bash
source /opt/scripts/nvm_autocomplete.sh
npm test
npm run typecheck
npm run lint
npx expo-doctor
npm test -- --config=docs/apresentacao-coverage.cjs
```

Expected: 45 suítes / 214 testes; 0 erros de tipo; 0 erros de lint com 11 warnings em `RouterGuards.test.tsx`; expo-doctor sem erro; cobertura ≈ 85,42/88,18/85,74/77,14.
Se divergir: parar e avisar o usuário antes de qualquer alteração.

### Task A: Skills sem uso

**Files:**
- Delete: `.opencode/skills/banner-design/` (2 arquivos), `brand/` (18), `design/` (35), `design-system/` (27), `frontend-design/` (1), `slides/` (6), `ui-styling/` (16), `ui-ux-pro-max/` (71, inclui 3 `.pyc` commitados em `scripts/__pycache__/`)
- Modify: `skills-lock.json`

- [ ] **Step 1: Remover as pastas**

```bash
git rm -r -q .opencode/skills/banner-design .opencode/skills/brand .opencode/skills/design .opencode/skills/design-system .opencode/skills/frontend-design .opencode/skills/slides .opencode/skills/ui-styling .opencode/skills/ui-ux-pro-max
```

- [ ] **Step 2: Alinhar o skills-lock.json**

Conteúdo final:

```json
{
  "version": 1,
  "skills": {}
}
```

- [ ] **Step 3: Verificar estado**

```bash
git status --porcelain
git ls-files .opencode/skills
```

Expected: só `writing-plans/{SKILL.md,plan-document-reviewer-prompt.md}` restam.

- [ ] **Step 4: Rodar as verificações**

```bash
source /opt/scripts/nvm_autocomplete.sh
npm test && npm run typecheck && npm run lint
npx expo-doctor
```

- [ ] **Step 5: Commit**

```bash
git add skills-lock.json
git -c user.name=rmofilh -c user.email=ricardomoreira1705@gmail.com commit -m "remove skills de design sem uso no app Expo"
```

### Task B: Dependências sem uso

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Remover os 4 pacotes**

```bash
source /opt/scripts/nvm_autocomplete.sh
npm uninstall ui-ux-pro-max-cli expo-glass-effect expo-device expo-web-browser
npx expo install --check
```

Expected: `expo install --check` sem achados; se reclamar de alguma remoção, reverter só aquela dependência e avisar.

- [ ] **Step 2: Rodar as verificações**

```bash
npm test && npm run typecheck && npm run lint
npx expo-doctor
```

- [ ] **Step 3: Commit**

```bash
git -c user.name=rmofilh -c user.email=ricardomoreira1705@gmail.com commit -am "remove dependências sem uso do template"
```

### Task C: Assets sem referência

**Files:**
- Delete: `assets/images/{expo-badge.png, expo-badge-white.png, expo-logo.png, logo-glow.png, react-logo.png, react-logo@2x.png, react-logo@3x.png, tutorial-web.png}`, `assets/images/tabIcons/` (6 arquivos)

- [ ] **Step 1: Confirmar zero referências**

```bash
grep -rn "expo-badge\|expo-logo\|logo-glow\|react-logo\|tutorial-web\|tabIcons" src/ app.json docs/ *.md *.js *.json 2>/dev/null | grep -v node_modules | grep -v package-lock
```

Expected: nenhuma linha.

- [ ] **Step 2: Remover**

```bash
git rm -q assets/images/expo-badge.png assets/images/expo-badge-white.png assets/images/expo-logo.png assets/images/logo-glow.png assets/images/react-logo.png "assets/images/react-logo@2x.png" "assets/images/react-logo@3x.png" assets/images/tutorial-web.png assets/images/tabIcons
```

- [ ] **Step 3: Rodar as verificações**

```bash
source /opt/scripts/nvm_autocomplete.sh
npm test && npm run typecheck && npm run lint
npx expo-doctor
```

- [ ] **Step 4: Commit**

```bash
git -c user.name=rmofilh -c user.email=ricardomoreira1705@gmail.com commit -m "remove assets do template sem referência"
```

### Task D: Lixo da raiz e .gitignore

**Files:**
- Delete: `1` (0 bytes), `.claude/settings.json` (pasta `.claude/` inteira)
- Modify: `.gitignore`

- [ ] **Step 1: Remover arquivos**

```bash
git rm -q 1 .claude/settings.json
```

- [ ] **Step 2: Ajustar .gitignore**

Remover a linha solta `example`. Adicionar, após o bloco `# typescript`:

```
# python
__pycache__/
*.pyc
```

- [ ] **Step 3: Verificar .claude removido do disco**

```bash
ls -la .claude 2>&1; git status --porcelain
```

Expected: `.claude` inexistente; working tree limpo após o commit.

- [ ] **Step 4: Rodar as verificações**

```bash
source /opt/scripts/nvm_autocomplete.sh
npm test && npm run typecheck && npm run lint
npx expo-doctor
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git -c user.name=rmofilh -c user.email=ricardomoreira1705@gmail.com commit -m "limpa lixo da raiz e ajusta gitignore"
```

### Task E: Stack da apresentação da fase 2

**Files:**
- Delete: `docs/apresentacao-ate-fase2.html` (40K), `docs/roteiro-apresentacao-ate-fase2.md` (16K), `docs/apresentacao-coverage.cjs` (4K), `docs/vendor/reveal/README.md`, `docs/vendor/reveal/6.0.2/LICENSE` (pasta `docs/vendor/` inteira)
- Modify: `eslint.config.js` (remover só a entrada `'docs/vendor/**'` do array `ignores`)

- [ ] **Step 1: Remover os arquivos**

```bash
git rm -q docs/apresentacao-ate-fase2.html docs/roteiro-apresentacao-ate-fase2.md docs/apresentacao-coverage.cjs docs/vendor/reveal/README.md docs/vendor/reveal/6.0.2/LICENSE
```

- [ ] **Step 2: Limpar entrada morta no eslint.config.js**

```js
{ ignores: ['dist/*', 'coverage/*'] },
```

- [ ] **Step 3: Verificar referências pendentes**

```bash
grep -rn "apresentacao-ate-fase2\|apresentacao-coverage\|roteiro-apresentacao\|docs/vendor" src/ app.json README.md AGENTS.md *.js *.json jest.setup.js 2>/dev/null | grep -v node_modules | grep -v package-lock
```

Expected: nenhuma linha (o plano histórico `docs/superpowers/plans/2026-10-04-apresentacao-fase2.md` mantém as menções por design — fora do escopo).

- [ ] **Step 4: Rodar as verificações**

```bash
source /opt/scripts/nvm_autocomplete.sh
npm test && npm run typecheck && npm run lint
npx expo-doctor
```

- [ ] **Step 5: Verificar cobertura sem o config excluído (equivalente via CLI)**

```bash
npx jest --coverage --coverageDirectory=node_modules/.cache/ate-apresentacao-coverage --collectCoverageFrom='src/**/*.{ts,tsx}' --collectCoverageFrom='!src/**/__tests__/**' --collectCoverageFrom='!src/**/*.d.ts' --collectCoverageFrom='!src/test-support/**' --coverageReporters=text-summary --coverageReporters=json-summary
```

Expected: mesmos números da linha base (coleta só de `src/`, intocado).

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js
git -c user.name=rmofilh -c user.email=ricardomoreira1705@gmail.com commit -m "remove arquivos da apresentação da fase 2"
```

### Task F: Resumo final

**Files:** nenhum.

- [ ] **Step 1: Medir depois**

```bash
git ls-files | wc -l
git ls-files -z | xargs -0 du -ch | tail -1
du -sh --exclude=node_modules --exclude=.git --exclude=.expo .
du -sh .git
git tag -l
git log --oneline -6
```

- [ ] **Step 2: Reverificação completa e resumo**

Rodar as 4 verificações + cobertura (CLI) e entregar ao usuário: o que saiu em cada categoria, tamanhos antes/depois e saídas comparadas à linha de base.
