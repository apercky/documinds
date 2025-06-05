# 📘 COMMIT_RULES.md

> Convenzioni ufficiali per i commit del progetto (basato su [Conventional Commits](https://www.conventionalcommits.org))  
> Usato per semantic-release e versionamento automatico.

---

## 📐 Formato base

```txt
<tipo>(<scope opzionale>): messaggio breve

Corpo (opzionale)

BREAKING CHANGE: descrizione (se presente)
```

---

## ✅ Tipi di commit e bump automatici

| Tipo         | Descrizione | Effetto su versione |
|--------------|-------------|----------------------|
| `fix:`       | Corregge un bug | 🔧 `PATCH` |
| `feat:`      | Aggiunge una nuova feature | ✨ `MINOR` |
| `chore:`     | Operazioni di manutenzione (build, deps, ecc.) | ⛔ Nessun bump |
| `docs:`      | Modifiche alla documentazione | ⛔ Nessun bump |
| `style:`     | Formattazione, spazi, punto e virgola | ⛔ Nessun bump |
| `refactor:`  | Refactoring senza cambiare comportamento | ⛔ Nessun bump |
| `test:`      | Aggiunta o modifica di test | ⛔ Nessun bump |
| `perf:`      | Ottimizzazioni di performance | 🔧 `PATCH` |
| `ci:`        | Modifiche alla pipeline CI/CD | ⛔ Nessun bump |
| `build:`     | Cambiamenti alla toolchain/build system | ⛔ Nessun bump |

---

## 🚨 Breaking Changes (rilascio MAJOR)

Un breaking change genera un bump `MAJOR` (`X.0.0`)

### 🔹 Metodo 1: Usa `!` nel tipo

```txt
feat!: rimosso supporto per IE11
```

### 🔹 Metodo 2: Usa `BREAKING CHANGE:` nel corpo

```txt
refactor(api): rimosso endpoint v1

BREAKING CHANGE: Tutti gli endpoint legacy sono stati rimossi.
```

---

## 🧪 Esempi corretti

```txt
fix: corretto errore di validazione email
feat(profile): aggiunto campo avatar
docs: aggiornato README con setup iniziale
refactor(auth): pulizia del middleware
feat!: rimosso supporto a /api/v1
```

---

## 🛑 Esempi errati

```txt
"bugfix login page" ❌  → manca tipo
"fix login" ❌         → non è nel formato corretto
"added profile picture" ❌ → non specifica tipo
```

---

## 🔒 Suggerimenti

- Usa `feat:` e `fix:` quando vuoi che semantic-release aggiorni le versioni.
- Usa `chore:` per aggiornamenti di dipendenze, script o file di configurazione.
- Inserisci `BREAKING CHANGE:` nel corpo per ogni modifica non retrocompatibile.
- Se vuoi, configura `commitlint` per validare i messaggi di commit.

---

✍️ *Segui queste regole per automatizzare changelog, versioning e CI/CD come un boss.*
