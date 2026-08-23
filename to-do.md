# Melhorias futuras — CMS

- **Tornar o alvo do rebuild trigger configurável.** Hoje
  `src/services/githubDispatch.js` tem o repositório de destino
  (`GScandelari/website-gscandelari`) fixo no código como uma
  constante — para reaproveitar este CMS em outro site (outro projeto
  Firebase), esse valor precisaria de uma alteração de código e
  redeploy. Trocar por uma env var/secret (ex.: `GITHUB_DISPATCH_REPO`)
  deixa isso 100% configuração, sem tocar em código, igual aos outros
  parâmetros por site (`CMS_API_KEY`, `ADMIN_EMAILS`,
  `ADMIN_PORTAL_ORIGINS`).

  Contexto: a ideia é que `cms` + `cms-admin` virem ferramentas
  reaproveitáveis (inclusive divulgadas como projeto no portfólio).
  Primeiro reaproveitamento planejado: o site da Amanda Giraldi.
