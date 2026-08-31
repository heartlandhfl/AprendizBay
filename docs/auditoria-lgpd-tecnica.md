# Auditoria técnica de privacidade / prontidão LGPD — Aprendiz Bay

**Tipo:** auditoria técnica do repositório e dos fluxos implementados.  
**Não é parecer jurídico** e não substitui revisão por profissional brasileiro de privacidade/LGPD.  
**Data da inspeção:** 31 de agosto de 2026.  
**Escopo:** código em `main` (política em `/privacidade`, consentimento de cookies, exclusão de conta, Firebase Auth/Firestore/Storage, verificação de professor, analytics, Sentry, e-mail, Asaas, mensagens, avaliações, logs visíveis no repositório).

A redação da Política de Privacidade e dos Termos **não foi alterada** nesta auditoria. Exemplos de interface abaixo estão em português brasileiro.

**Veredito técnico:** a plataforma já tem peças importantes (banner de cookies, exclusão self-service, regras de Storage para credenciais, `sendDefaultPii: false` no Sentry, CPF enviado ao Asaas sem persistir no Firestore). **Não está pronta para ser apresentada como conformidade LGPD.** O aviso em `/privacidade` é rascunho sem controlador identificado; o consentimento não controla métricas; vários identificadores e conteúdos permanecem após a exclusão; e documentos de `users`, `reviews` e `collectiveHubs` vazam mais dados do que a UI mostra.

---

## 1. Quais dados pessoais são coletados?

| Categoria | Campos observados no código | Origem |
| --- | --- | --- |
| Conta (Firebase Authentication) | e-mail, senha (hash no Firebase), `displayName`, `photoURL`, UID, provedor Google | `lib/auth/service.ts` |
| Perfil `users/{uid}` | `role`, `displayName`, `email`, `photoUrl`, `createdAt`, `updatedAt` | cadastro e upload de foto |
| Perfil público de professor `tutors/{uid}` | nome, matéria, cidade, estado, bio, about, methodology, headline, preços, modalidade, foto, disponibilidade, níveis, experiência | onboarding e dashboard |
| Credenciamento | arquivo PDF/JPG/PNG em Storage; `credentialFileName` no documento do professor | `lib/storage/service.ts` |
| Reservas `bookings/{id}` | `studentId`, `tutorId`, horário, preço, taxas, status, `paymentId`, `asaasCheckoutId`, `meetingUrl`, estorno | APIs de reserva/pagamento |
| Checkout Asaas (não gravado no Firestore) | nome, e-mail, **CPF**, telefone, endereço, número, bairro, CEP | `PayBookingForm` → `create-checkout` |
| Avaliações `reviews/{bookingId}` | `studentId`, `tutorId`, `bookingId`, nota, **comentário até 2000 caracteres** | `POST /api/reviews` |
| Mensagens | texto até 2000 caracteres, `senderId`, nomes nas conversas | `lib/conversations/service.ts` |
| Denúncias | `reporterId`, `reportedUserId`, motivo, detalhes | `conversationReports` |
| Turmas `collectiveHubs` | `tutorId`, `tutorName`, `confirmedStudentIds[]` | join de aluno |
| Cookies / dispositivo | preferência `ab_cookie_consent` no `localStorage`; sessão Firebase | banner e Auth |
| Analytics (se `PLAUSIBLE_DOMAIN` estiver definido) | pageview (URL), `sign_up` (papel/método), `search` (**consulta digitada**), `profile_view` (`tutor_id`, matéria), `booking_started`, `payment_completed` (`booking_id`) | `ObservabilityProvider`, eventos |
| Erros (se DSN Sentry existir) | exceção, ambiente, URL/stack — `sendDefaultPii: false` | Sentry client/server |
| E-mail operacional | nome, e-mail, horário da aula, **link da sala**, nota e comentário da avaliação | Resend ou SendGrid |
| Auditoria admin | `actorUid`, ação, `targetId`, metadados | `adminAuditLogs` |

Não há coleta de cartão no aplicativo. Não há data de nascimento nem verificação de idade no cadastro, apesar do texto de `/privacidade` afirmar que o serviço é dirigido a maiores de 18 anos. Os Termos, por outro lado, admitem menor com responsável — inconsistência que exige revisão jurídica.

**Exemplo de cadastro (PT-BR):** o formulário pede nome, e-mail e senha, ou “Continuar com Google”, e o papel aluno/professor. Não pede idade nem consentimento específico além dos termos.

---

## 2. Onde os dados são armazenados?

| Destino | O que fica |
| --- | --- |
| **Firebase Authentication** (projeto Google) | identidade, e-mail, hash de senha, tokens de sessão no dispositivo |
| **Cloud Firestore** | `users`, `tutors` (+ `availability`), `bookings`, `reviews`, `conversations`/`messages`, `collectiveHubs`, `userBlocks`, `conversationReports`, `messageRateLimits`, `lessonSlots`, `asaasWebhookReceipts`, `adminAuditLogs` |
| **Firebase Storage** | `users/{uid}/avatar.jpg` (e cover); `tutors/{uid}/credentials/*`; `tutors/{uid}/verification/*` (admin); `tutors/{uid}/portfolio/*`; `hubs/{hubId}/materials/*`; `bookings/{bookingId}/materials/*` |
| **Asaas** | cliente (CPF, contato, endereço), cobrança, PIX/cartão, estorno. Aprendiz Bay guarda só IDs e valores na reserva |
| **Jitsi (`meet.jit.si`)** | sala `https://meet.jit.si/aprendizbay-{bookingId}` — o nome da sala é o ID da reserva |
| **Resend ou SendGrid** | cópia do e-mail transacional (corpo com nomes, horário, link, comentário) |
| **Plausible** (`plausible.io` por padrão) | eventos e pageviews, se o domínio público estiver configurado |
| **Sentry** | eventos de erro, se o DSN estiver configurado |
| **Hospedagem (Hostinger / prévia Vercel)** | logs de processo (`console.error` de e-mail, falhas de API); retenção **não está no repositório** |
| **Navegador** | `localStorage` chave `ab_cookie_consent`; IndexedDB/localStorage do Firebase Auth |

Backups automáticos do Firebase (PITR, exportações, snapshots) **não aparecem no repositório**. Se estiverem ligados no console, cópias de `users`, reservas e credenciais sobrevivem à exclusão pelo prazo do provedor.

---

## 3. Quem pode acessar?

Acesso efetivo = regras de Firestore/Storage + Admin SDK + operadores.

| Ator | Acesso |
| --- | --- |
| **Visitante (sem login)** | Perfis de professor `isVerified == true` (documento **inteiro**, inclusive `credentialFileName`); `tutors/*/availability`; `reviews` (documento inteiro); `collectiveHubs` (incluindo `confirmedStudentIds`); fotos públicas; portfólio |
| **Qualquer usuário autenticado** | `get` de **qualquer** `users/{uid}` (e-mail, nome, foto, papel). Confirmado em `tests/rules/firestore.rules.test.ts` (“allows an authenticated user to read a counterpart profile by id” — aluno e professor leem o mesmo `users/{uid}`) |
| **Aluno** | próprias reservas; conversas em que participa; denúncias que criou; bloquear; join em turma |
| **Professor** | próprias reservas e perfil; credencial própria; materiais de aula se participante; dashboard |
| **Admin (`role: admin`)** | listar `users`; todas as reservas; denúncias (metadados, não mensagens); revisão de credencial; dashboard (totais + 10 avaliações recentes com `studentId` e comentário); Storage `verification/` |
| **Admin SDK (servidor)** | tudo: exclusão, webhook Asaas, ocupação, e-mail, auditoria. Contorna regras |
| **Participante da conversa** | mensagens. **Admins não leem mensagens** pelas regras (moderação só via `conversationReports`) |
| **Operadores externos** | Google (Firebase), Asaas, Hostinger/Vercel, Jitsi, Resend/SendGrid, Plausible, Sentry — conforme chaves de ambiente |

Quem tem a chave `FIREBASE_ADMIN_*` ou acesso ao Console Firebase lê o banco e o bucket por completo. Isso não está documentado na política além de “Google Firebase”.

---

## 4. Quais dados são públicos?

**Público de fato** (regra `allow read: if true` ou get sem autenticação):

- Perfil de professor verificado: nome, cidade, bio, preços, foto, `userId`, e também campos que a UI esconde (`credentialFileName`, `reviewedBy`, `verificationReason`).
- Grade de horários (`availability`).
- Avaliações: nota, comentário, `studentId`, `bookingId`, `tutorId`.
- Turmas: título, preço, vagas **e** a lista `confirmedStudentIds` no documento cru.
- Fotos `users/{uid}/avatar.*` e `cover.*`; portfólio do professor.

A UI reduz o que mostra (ex.: `PublicTutorReview` só nota/comentário; `toPublicCollectiveHub` omite IDs). **Isso não é controle de acesso.** Qualquer cliente Firebase com as regras publicadas lê o documento completo.

**Exemplo público (PT-BR) em `/tutor/{id}`:** “Avaliações” com nota e o texto livre do aluno. O `studentId` não aparece na tela, mas está no Firestore para qualquer leitor.

---

## 5. Quais dados são privados?

**Pretendidos como privados / autenticados:**

| Dado | Controle técnico | Lacuna |
| --- | --- | --- |
| E-mail em `users/{uid}` | get exige login | Qualquer logado lê o e-mail de qualquer UID |
| Reservas | aluno, professor da aula, admin | IDs e valores; ocupação pública só devolve ISO de horários |
| Mensagens | só participantes | ID da conversa = `{studentId}_{tutorId}` |
| Credencial (`credentials/`) | dono + admin via `getBlob` autenticado | nome do arquivo no doc público do professor verificado |
| Cópias admin (`verification/`) | só admin | — |
| Materiais de aula | participantes da reserva/turma | **não são apagados** na exclusão da conta |
| Recibos Asaas, `lessonSlots`, `adminAuditLogs` | só Admin SDK | IDs de aluno/reserva permanecem após exclusão |
| CPF / endereço de checkout | não gravados no Firestore | vão ao Asaas; podem aparecer em logs de API se o host gravar o body |

---

## 6. O que acontece quando uma conta é excluída?

Fluxo: `/configuracoes` → “Excluir minha conta” → confirmar `EXCLUIR CONTA` → `POST /api/account/delete` (`lib/account/anonymize.js`).

**Bloqueios:**

- Conta `admin` não pode ser excluída por este fluxo (`ADMIN_ACCOUNT`).
- Reserva **paga** com status `pending` ou `confirmed` bloqueia a exclusão (`ACTIVE_PAID_BOOKINGS`, HTTP 409). Texto atual: *“Cancele as reservas pagas pendentes ou confirmadas antes de excluir a conta…”*

**O que é apagado:**

- Documento `users/{uid}`.
- Usuário no Firebase Authentication.
- Prefixo Storage `users/{uid}/` e `tutors/{uid}/` (foto + credenciais + portfólio) — **melhor esforço**; falha é ignorada.
- `messageRateLimits/{uid}`.
- `userBlocks` em que a pessoa é blocker ou blocked.
- `conversationReports` em que a pessoa é **reporter** (não as denúncias **contra** ela).
- Subcoleção `tutors/{uid}/availability`.

**O que não é apagado** (anonimizado ou só marcado):

- Reservas, avaliações, conversas, perfil `tutors/{uid}`, turmas (ver seções 7–10).
- `lessonSlots/{tutorId}_{scheduledAt}` com `studentId`.
- `asaasWebhookReceipts` (IDs de cobrança/reserva).
- `adminAuditLogs` (`actorUid` / `targetId`).
- Denúncias em que o UID é `reportedUserId`.
- Materiais em `hubs/*/materials` e `bookings/*/materials`.
- Histórico no Asaas, Resend/SendGrid, Plausible, Sentry, Jitsi, backups Firebase, logs do host.
- Preferência de cookies no `localStorage` do aparelho.

Não existe endpoint de **exportação/portabilidade** (art. 18, V) no código.

**Exemplo de UI (PT-BR):** *“Entendi que reservas e avaliações continuam no sistema de forma anonimizada e que reservas pagas ativas precisam ser canceladas antes.”*

---

## 7. O que acontece com as reservas?

| Estado na exclusão | Efeito |
| --- | --- |
| `pending` / `confirmed` **não pagas** | `status: cancelled` + `studentAnonymized` ou `tutorAnonymized` + `anonymizedAt` |
| `pending` / `confirmed` **pagas** | exclusão recusada |
| `completed` / `cancelled` | documento permanece; só a flag de anonimização |

Campos que **permanecem** no documento: `studentId`, `tutorId`, `scheduledAt`, `price`, `platformFee`, `tutorAmount`, `paymentId`, `asaasCheckoutId`, `meetingUrl`, `refundId`, etc.

A UI de aulas resolve o nome via `users/{uid}`; se o doc sumiu, mostra **“Conta encerrada”**. O UID da outra parte continua visível para aluno/professor/admin da reserva.

`lessonSlots` (trava de horário, só Admin SDK) **não é limpo**. Continua com `studentId`.

---

## 8. O que acontece com as avaliações?

- Documento **não é apagado**.
- Apenas `studentAnonymized` e/ou `tutorAnonymized` + `anonymizedAt`.
- **Comentário e nota permanecem** e continuam **publicamente legíveis**.
- `studentId` e `bookingId` permanecem (o ID da avaliação **é** o ID da reserva).

A UI pública não consulta a flag de anonimização. O texto livre do aluno segue no perfil do professor.

**Exemplo (PT-BR) que permanece público após exclusão do aluno:** *“Aula clara e objetiva.”* com a nota, ligado ao `tutorId` e ao `studentId` residual.

Para o professor excluído, o perfil some da busca (`isVerified: false`, `verificationStatus: suspended`), mas as avaliações antigas ainda são listáveis por `tutorId` se alguém souber o UID.

---

## 9. O que acontece com as mensagens?

- Conversas em que o UID está em `participantIds` **não são apagadas**.
- `lastMessage` vira `[mensagem removida]`; `studentName` ou `tutorName` vira `Conta encerrada`.
- Mensagens **enviadas pelo titular**: `text` → `[mensagem removida]`.
- Mensagens **da outra parte**: **permanecem** (remetente, texto, data).
- `studentId`, `tutorId`, `participantIds` e o ID `{uidAluno}_{uidProfessor}` **permanecem**.
- A outra parte continua podendo ler o histórico (com textos do titular tachados).

---

## 10. O que acontece com os documentos de verificação?

| Artefato | Na exclusão |
| --- | --- |
| Arquivos `tutors/{uid}/credentials/*` | Tentativa de `deleteFiles` no prefixo `tutors/{uid}/` |
| Arquivos `tutors/{uid}/verification/*` | Idem (mesmo prefixo) |
| `credentialFileName` no doc Firestore | `FieldValue.delete()` |
| Doc `tutors/{uid}` | **permanece**: nome `Conta encerrada`, bio/cidade limpos, `isVerified: false`, `suspended` |
| `userId` no perfil | **não é removido** |
| Falha de Storage | ignorada; arquivo pode ficar no bucket |

Enquanto o professor está ativo, a credencial não é URL pública: a equipe usa `getBlob` autenticado. O **nome do arquivo** no documento verificado é legível por qualquer cliente Firestore.

---

## 11. Quais dados são enviados ao Asaas?

`POST /v3/checkouts` (`lib/payments/asaas.ts` → `customerData`):

- `name` — `displayName` do perfil ou `"Aluno Aprendiz Bay"`
- `cpfCnpj` — CPF digitado no checkout (validado em `lib/payments/cpf.ts`)
- `email` — do formulário ou do perfil
- `phone` — telefone com DDD
- `address`, `addressNumber`, `postalCode`, `province`
- `externalReference` — ID da reserva
- item: `"Aula Individual"` / `"Aula Coletiva"`, valor, imagem placeholder

Estorno: `POST /v3/payments/{id}/refund` com descrição *“Cancelamento da aula no Aprendiz Bay”*.

Webhook devolve `payment.id`, `checkout.id`, `externalReference`. Recibos em `asaasWebhookReceipts` (Admin SDK).

**Não enviado pelo app:** número de cartão, CVV, token PIX — o aluno preenche na página do Asaas.

Se `ASAAS_WEBHOOK_TOKEN` estiver vazio, `isAuthorizedAsaasWebhook` **aceita qualquer webhook** (`asaas.ts`). Isso é falha de integridade de pagamento e pode gravar IDs/status a partir de um POST não autenticado.

CPF e endereço **não são gravados** em `bookings` nem em `users` no código inspecionado.

**Exemplo de checkout (PT-BR):** *“Preencha telefone, CEP e endereço para o Asaas gerar o checkout.”* Campos: CPF, telefone, e-mail, endereço, número, bairro, CEP.

---

## 12. Quais dados vão para analytics e monitoramento de erros?

### Plausible

- Só envia se `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `PLAUSIBLE_DOMAIN` existir.
- Cliente: script `https://plausible.io/js/script.manual.js` + pageview da URL completa em cada mudança de rota.
- Eventos: `sign_up` (`role`, `method`), `search` (`query`, `modality`, `source`), `profile_view` (`tutor_id`, `subject`), `booking_started` (`tutor_id`, `type`), `payment_completed` (`booking_id`, `type`) no servidor.
- **Não consulta** `readCookieConsent()`. O banner e `/privacidade` dizem que cookies opcionais de métricas **não estão ativos**; o código carrega Plausible assim que o domínio é configurado.

### Sentry

- Cliente e servidor: `sendDefaultPii: false`, traces 0 no browser.
- `ObservabilityProvider` chama `initClientSentry` **sempre** que há DSN, sem consentimento.
- Express: `setupExpressErrorHandler` se houver DSN.
- Payloads típicos: mensagem de erro, stack, URL da API, às vezes `bookingId` em erros de checkout (o route tenta não devolver detalhe interno ao cliente, mas `captureServerException` envia o `Error`).

### E-mail (vizinho operacional)

Não é analytics, mas é transferência: Resend/SendGrid recebem e-mail do titular, nomes, horário, `meetingUrl`, comentário da avaliação. `POST /api/notifications` aceita **qualquer usuário autenticado** e dispara o tipo pedido (`pending_booking`, `confirmed_booking`, `new_review`) **sem verificar** se o UID é parte da reserva. Isso permite spam e vazamento do link da aula para a caixa do aluno/professor.

---

## Inventário rápido: público × privado × residual

```
Público (regra Firestore/Storage)
  tutors verificados (doc completo) · availability · reviews · collectiveHubs
  avatar/cover · portfolio

Privado na intenção, amplo na prática
  users/{uid}  → qualquer logado
  credentialFileName em tutor verificado → qualquer cliente

Privado (regra alinhada à UI)
  bookings (partes + admin) · conversations/messages (participantes)
  credentials blob · verification/ · webhook receipts · audit logs · lessonSlots

Residual após exclusão
  UIDs em bookings/reviews/conversations/lessonSlots
  comentários de review · mensagens da outra parte
  IDs Asaas · e-mails já enviados · eventos Plausible/Sentry
  materiais de hub/reserva · backups/logs de provedor
```

---

## Lacunas entre o rascunho de `/privacidade` e o código

Estas são **observações técnicas** para a revisão jurídica — a redação da política não foi editada.

1. Controlador: razão social, CNPJ e endereço *“ainda não constam”*; Encarregado (art. 41) não nomeado. Canal `privacidade@aprendizbay.com.br` / `contato@aprendizbay.com.br` no código, sem prova de caixa ativa.
2. Operadores omitidos ou incompletos: **Plausible, Sentry, Resend/SendGrid, Jitsi (meet.jit.si)**. A política cita Firebase, Asaas, Hostinger/Vercel e “videoconferência” só com o ID da reserva.
3. Cookies opcionais “não estão ativos neste rascunho”, mas Plausible/Sentry ligam por variável de ambiente, **sem** o banner.
4. Anonimização: a política diz que reservas/avaliações ficam sem nome ou e-mail. Tecnicamente o **UID**, o **comentário** e os **IDs de pagamento** permanecem.
5. Menores: política = 18 anos; Termos = 18 ou menor com responsável; cadastro **não** pergunta idade.
6. Direitos: acesso, correção e portabilidade só por e-mail — não há API. Correção de e-mail no `users` é bloqueada pelas regras (só admin).
7. Transferência internacional (art. 33): Firebase, Plausible, Sentry e Jitsi tipicamente fora do Brasil; não há SCC/cláusulas no repo.

O banner da própria página já avisa: *“Rascunho pendente de revisão jurídica”* e *“não deve ser publicado como documento final sem revisão por advogada ou advogado.”*

---

## Lista de remediação técnica

Prioridade: **P0** risco alto de vazamento ou de descasamento grave com o que a UI promete; **P1** exclusão/operadores; **P2** direitos e higiene.

### P0 — acesso e consentimento

1. **Restringir `users/{uid}` get** ao dono, a quem tem reserva/conversa com a pessoa, ou admin. Ajustar `firestore.rules` e os testes que hoje exigem leitura cruzada. A UI de aulas deve obter o nome por API Admin ou campo denormalizado, não por `getDoc` em qualquer UID.
2. **Não expor `reviews` crus ao público.** Servir só `{ rating, comment, createdAt }` (e omitir ou hashear `studentId`/`bookingId`) via API ou regras + campos separados. Impedir query anônima de `studentId`.
3. **Não deixar `confirmedStudentIds` no documento publicamente legível.** Contador público + roster só para tutor/admin/participantes (subcoleção privada ou Cloud Function).
4. **Omitir no documento público do professor** (ou negar get anônimo dos campos) `credentialFileName`, `reviewedBy`, `reviewedAt`, `verificationReason`.
5. **Ligar Plausible e Sentry no cliente só se** `readCookieConsent()?.optional === true`. Não injetar o script se a escolha for “Só necessários” ou se ainda não houver decisão. Pageview/eventos server-side: ou não enviar identificadores, ou tratar como necessário/legítimo interesse **depois** da revisão jurídica — não como “opcional inativo”.
6. **Autorizar `POST /api/notifications`** só se o UID for `studentId`/`tutorId` da reserva (ou autor da avaliação). Cron de lembrete já usa segredo; manter `NOTIFICATIONS_CRON_SECRET` obrigatório em produção.
7. **Exigir `ASAAS_WEBHOOK_TOKEN`** em produção; recusar webhook sem token.

### P1 — exclusão e minimização

8. **Redigir comentários de review** do titular (ex.: `[avaliação removida]`) ou retirar o texto público, mantendo só a nota agregada se a base legal exigir histórico.
9. **Remover ou substituir UIDs** em conversas (`participantIds`, ID composto), ou fechar o thread e apagar mensagens das duas pontas quando ambas pedirem / após prazo.
10. **Apagar ou esvaziar `lessonSlots`** do aluno; apagar denúncias em que é `reportedUserId` (ou anonimizar o UID).
11. **Apagar materiais** em `bookings/{id}/materials` e `hubs/{id}/materials` ligados ao titular, ou transferir titularidade.
12. **Falhar a exclusão se o Storage não limpar** credenciais/fotos (hoje o `catch` silencioso deixa documento de identidade no bucket).
13. **Não reutilizar o UID** como chave eterna em reviews/conversas; ou documentar retenção e hashear.
14. **Minimizar eventos Plausible:** não enviar `query` de busca nem `booking_id`. Preferir agregados.
15. **Sala de aula:** Jitsi público com ID previsível (`aprendizbay-{bookingId}`) é sala aberta a quem adivinhar o ID. Usar provedor com sala autenticada ou token opaco.
16. **Logs de e-mail:** `console.error` em `safeNotify` / cliente pode gravar endereço no log do Hostinger. Redigir destinatário.

### P2 — direitos do titular e operação

17. **Exportação self-service** (JSON): perfil, reservas próprias, avaliações, mensagens. Texto de UI sugerido: *“Baixar meus dados”*.
18. **Correção de e-mail** com reautenticação, ou fluxo suportado — hoje o dono não altera `email` nas regras.
19. **Idade no cadastro** alinhada à decisão jurídica (bloqueio 18+ **ou** fluxo de responsável). Sem coleta de data se a decisão for só declaração: checkbox *“Declaro ter 18 anos ou mais”*.
20. **Inventário de processadores** no runbook (não na política, até a revisão): Firebase (região), Asaas (Brasil), Plausible, Sentry, Resend/SendGrid, Jitsi, Hostinger. Registrar DPAs e transferência.
21. **Retenção:** prazos para `adminAuditLogs`, recibos Asaas, backups Firebase, caixas Resend/SendGrid, issues Sentry. Job de expurgo.
22. **Contas admin:** processo offline de exclusão/anonimização (o fluxo atual recusa).
23. **Confirmar** se `privacidade@aprendizbay.com.br` existe e quem responde no prazo legal.
24. Depois da revisão jurídica, **preencher** (não inventar) razão social, CNPJ, endereço e Encarregado na política — fora do escopo desta auditoria.

---

## O que um profissional brasileiro de privacidade/LGPD precisa revisar

Itens que o código **não pode fechar sozinho**:

1. **Identificação do controlador** e nomeação do Encarregado (art. 41), se obrigatório para o porte da operação.
2. **Bases legais** por tratamento: contrato vs. legítimo interesse vs. obrigação legal (guarda fiscal de pagamentos) vs. consentimento (cookies/métricas). O rascunho já lista arts. 7º e 11; precisa de LIA se usarem legítimo interesse para manter reviews/reservas.
3. **Anonimização vs. pseudonimização:** UID + comentário + ID de reserva **não** são anônimos. Avaliar se a retenção atende art. 16 / exceções do art. 18 §4º (exercício de direitos, obrigação legal).
4. **Avaliacoes públicas** com texto livre após exclusão da conta — direito ao esquecimento vs. integridade do marketplace.
5. **Menores (art. 14)** e o conflito Termos × Política × ausência de gate no signup.
6. **Transferência internacional (art. 33)** para Google, Plausible, Sentry, Jitsi e possíveis regiões do e-mail.
7. **Compartilhamento com Asaas** (CPF, endereço) e deveres do operador de pagamento; o que o aluno deve ver no checkout.
8. **Prazos de retenção** de cobrança, nota fiscal, defesa do consumidor e logs de segurança.
9. **Incidentes** (art. 48): processo, prazo ANPD, texto ao titular. O rascunho só promete aviso.
10. **Cookies:** se Plausible/Sentry exigem consentimento no entendimento da ANPD ou se cabem como estritamente necessários / legítimo interesse — e se o storage `ab_cookie_consent` deve ser cookie com mesma política.
11. **Portabilidade e acesso:** formato e prazo; se e-mail manual basta no estágio atual.
12. **Publicação:** o banner já diz que o texto **não deve ser publicado como documento final** sem advogada/advogado. Manter o banner até essa revisão.

---

## Evidências no repositório (amostra)

| Tema | Onde |
| --- | --- |
| Política (rascunho) | `app/privacidade/page.tsx` |
| Banner / consentimento | `components/legal/CookieConsentBanner.tsx`, `lib/legal/cookie-consent.ts` |
| Exclusão / anonimização | `lib/account/anonymize.js`, `components/settings/DeleteAccountSection.tsx` |
| Regras de acesso | `firestore.rules`, `storage.rules`, `tests/rules/*.test.ts` |
| Checkout Asaas | `lib/payments/asaas.ts`, `app/api/payments/create-checkout/route.ts` |
| Analytics / Sentry | `components/observability/ObservabilityProvider.tsx`, `lib/analytics/*`, `lib/observability/*` |
| E-mail | `lib/notifications/core.js`, `server/api/notifications.js` |
| Credenciais | `lib/storage/service.ts`, `storage.rules` |

---

## Como reexecutar esta auditoria

Não há suite automatizada de “LGPD”. Regressão útil após remediações:

```bash
npm test
# em especial: testes de regras e exclusão
npx vitest run tests/rules/firestore.rules.test.ts tests/rules/storage.rules.test.ts
node scripts/test-account-api.js
```

Conferir manualmente: `/privacidade`, `/configuracoes` (cookies + exclusão), checkout com CPF de teste, e, no Emulator, `getDoc(users/{outroUid})` e `getDocs(reviews)` como visitante.
