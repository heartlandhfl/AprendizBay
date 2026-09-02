import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import {
  LEGAL_LAST_UPDATED_LABEL,
  PRIVACY_CONTACT_EMAIL,
  SUPPORT_CONTACT_EMAIL,
} from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Política de Privacidade — Aprendiz Bay",
  description:
    "Rascunho da Política de Privacidade da Aprendiz Bay, com bases legais da LGPD, cookies e direitos do titular. Pendente de revisão jurídica.",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacidadePage() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      description="Este aviso explica quais dados pessoais a Aprendiz Bay trata, com que bases legais da LGPD, com quem compartilha e como você exerce seus direitos."
    >
      <LegalSection id="controlador" title="1. Quem controla os dados">
        <p>
          O controlador dos dados pessoais tratados neste site é a Aprendiz Bay,
          plataforma de intermediação de aulas. A razão social, o CNPJ e o
          endereço da pessoa jurídica{" "}
          <strong>ainda não constam deste rascunho</strong> e devem ser
          preenchidos após revisão jurídica, antes de qualquer publicação como
          política oficial.
        </p>
        <p>
          Canal de privacidade (titulares e ANPD):{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          . Suporte geral:{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
          . O Encarregado de Dados (art. 41 da LGPD) será nomeado e divulgado
          nesta página quando a estrutura societária estiver definida.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="2. Quais dados coletamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Cadastro:</strong> nome de exibição, e-mail, senha (hash no
            Firebase Authentication) ou identificadores da conta Google, foto
            e papel (aluno ou professor).
          </li>
          <li>
            <strong>Perfil de professor:</strong> matéria, cidade, estado, bio,
            metodologia, preços, disponibilidade, documentos de credenciamento e
            foto.
          </li>
          <li>
            <strong>Uso da plataforma:</strong> reservas, status de pagamento,
            valores, taxa da plataforma, horários, link da sala, mensagens,
            avaliações e participação em turmas coletivas.
          </li>
          <li>
            <strong>Pagamento:</strong> dados enviados ao processador de
            pagamentos no checkout (nome, e-mail, CPF e telefone informados pelo
            aluno; endereço quando exigido pelo Asaas). Conforme a configuração
            vigente, o processador pode ser o <strong>Mercado Pago</strong> e/ou
            o <strong>Asaas</strong>. A Aprendiz Bay guarda na reserva
            identificadores da cobrança, do checkout e do pagamento, não o cartão
            completo.
          </li>
          <li>
            <strong>Programa de facilitadores:</strong> código de indicação,
            cliques em links de referência, registro de indicação na criação da
            conta, status antifraude da indicação, comissões e repasses
            associados ao facilitador (quando aplicável).
          </li>
          <li>
            <strong>Indicação e cookies:</strong> cookie ou identificador
            equivalente (<code className="rounded bg-muted px-1.5 py-0.5 text-sm">ab_referral_code</code>)
            para associar visitantes a um facilitador, pelo prazo informado na
            seção de cookies.
          </li>
          <li>
            <strong>Técnicos:</strong> cookies e armazenamentos estritamente
            necessários à sessão, preferência de cookies e logs de segurança
            dos provedores.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="bases" title="3. Bases legais (LGPD, art. 7º e 11)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Execução de contrato</strong> (art. 7º, V): criar conta,
            agendar, pagar, ministrar ou assistir à aula e enviar mensagens.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal ou regulatória</strong> (art.
            7º, II): guarda de registros de pagamento, estorno e suporte a
            obrigações fiscais ou de defesa do consumidor.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX), com teste de
            balanceamento: prevenção a fraude (incluindo autoindicação e abuso
            do programa de facilitadores), segurança, melhoria do produto e
            manutenção da integridade de reservas e avaliações após exclusão da
            conta.
          </li>
          <li>
            <strong>Consentimento</strong> (art. 7º, I): cookies opcionais, se
            e quando forem usados, e tratamentos que a lei exigir.
          </li>
        </ul>
        <p>
          Não temos a intenção de tratar dados sensíveis (art. 11) como regra
          do serviço. Documentos de credenciamento devem evitar informação de
          saúde, religião ou similar que não seja necessária à verificação.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" title="4. Finalidades">
        <p>
          Usamos os dados para autenticar usuários, exibir perfis, operar
          reservas e turmas, processar pagamentos e estornos, administrar o
          programa de indicação de facilitadores (quando ativo), recalcular
          notas de professores, prestar suporte, cumprir a lei e comunicar avisos
          operacionais da conta. Não vendemos dados pessoais.
        </p>
      </LegalSection>

      <LegalSection id="compartilhamento" title="5. Compartilhamento e transferência">
        <p>Operadores e parceiros típicos deste produto:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Google Firebase</strong> (Authentication, Firestore, Storage)
            — hospedagem da conta, banco e arquivos;
          </li>
          <li>
            <strong>Mercado Pago</strong> — checkout hospedado, confirmação de
            pagamento, estornos e notificações de transação (conforme rollout);
          </li>
          <li>
            <strong>Asaas</strong> — checkout, PIX, cartão e estornos (quando
            configurado como processador ativo);
          </li>
          <li>
            <strong>Hospedagem do site</strong> (hoje Hostinger; prévias podem
            usar Vercel) — entrega das páginas e APIs;
          </li>
          <li>
            <strong>Videoconferência</strong> (sala gerada para a aula online) —
            apenas o identificador da reserva no nome da sala.
          </li>
        </ul>
        <p>
          Esses provedores podem armazenar dados fora do Brasil. Nesse caso, a
          transferência internacional observa o art. 33 da LGPD (cláusulas
          contratuais, adequação ou outra garantia a ser validada na revisão
          jurídica).
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies e tecnologias semelhantes">
        <p>
          Usamos, de forma estritamente necessária, identificadores de sessão do
          Firebase Authentication e a preferência de cookies gravada neste
          dispositivo. Sem eles, login e reservas autenticadas não funcionam.
        </p>
        <p>
          Para o programa de indicação de facilitadores, podemos usar o cookie{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">ab_referral_code</code>{" "}
          (ou parâmetro equivalente na URL) para lembrar qual link de indicação
          foi acessado antes do cadastro, em geral por até 30 dias. Esse cookie
          apoia a atribuição de indicações e métricas do facilitador; a base
          legal e a necessidade de consentimento adicional devem ser validadas
          na revisão jurídica.
        </p>
        <p>
          <strong>Cookies opcionais</strong> (métricas ou marketing){" "}
          <em>não estão ativos neste rascunho do produto</em>. O banner de
          consentimento registra sua escolha para o caso de virem a ser
          habilitados. Você pode mudar a preferência em{" "}
          <Link href="/configuracoes" className="font-medium text-primary-700 hover:text-primary-600">
            Configurações
          </Link>{" "}
          ou no rodapé. Recusar opcionais não impede o uso essencial do site.
        </p>
      </LegalSection>

      <LegalSection id="retencao" title="7. Retenção, exclusão e anonimização">
        <p>
          Dados de cadastro permanecem enquanto a conta existir. Ao excluir a
          conta em Configurações, apagamos o documento{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">users/{"{uid}"}</code>{" "}
          e a conta no Firebase Authentication, além de arquivos de foto e
          credenciais quando existirem.
        </p>
        <p>
          Reservas e avaliações <strong>não são apagadas</strong>: são
          anonimizadas (marcadores de conta encerrada, sem nome ou e-mail) para
          preservar a integridade do histórico da outra parte, das notas
          públicas e de registros financeiros. Mensagens e o perfil público de
          professor são anonimizados; turmas do professor são encerradas.
          Identificadores de pagamento, registros de comissão de facilitadores
          e dados de indicação podem ser mantidos pelo prazo necessário à
          prevenção de fraude, cumprimento fiscal e defesa em processos, conforme
          orientação jurídica.
        </p>
      </LegalSection>

      <LegalSection id="direitos" title="8. Direitos do titular (LGPD, art. 18)">
        <p>Você pode solicitar, na medida da lei:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>confirmação da existência de tratamento e acesso aos dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade, quando aplicável;</li>
          <li>informação sobre compartilhamentos e bases legais;</li>
          <li>revogação do consentimento (cookies opcionais e outros consentimentos);</li>
          <li>eliminação dos dados tratados com consentimento, observadas exceções legais;</li>
          <li>revisão de decisões automatizadas, se passarmos a utilizá-las.</li>
        </ul>
        <p>
          Pedidos: {PRIVACY_CONTACT_EMAIL}. A exclusão self-service da conta
          está em{" "}
          <Link href="/configuracoes" className="font-medium text-primary-700 hover:text-primary-600">
            /configuracoes
          </Link>
          . Também é possível peticionar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection id="seguranca" title="9. Segurança e menores">
        <p>
          Adotamos controles dos provedores (autenticação, regras de Firestore
          e Storage, APIs autenticadas por token). Nenhum sistema é isento de
          risco; avisaremos incidentes relevantes nos termos da LGPD.
        </p>
        <p>
          O serviço é dirigido a maiores de 18 anos. Tratamento de dados de
          crianças e adolescentes, se ocorrer, observará o art. 14 da LGPD e
          exigirá revisão específica antes de qualquer oferta a esse público.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="10. Alterações">
        <p>
          Este rascunho foi atualizado em {LEGAL_LAST_UPDATED_LABEL}. Versões
          futuras, após revisão jurídica, serão publicadas nesta página. Quando
          a mudança for relevante, poderemos avisar na interface ou por e-mail
          da conta.
        </p>
        <p>
          Os{" "}
          <Link href="/termos" className="font-medium text-primary-700 hover:text-primary-600">
            Termos de Uso
          </Link>{" "}
          complementam esta política.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
