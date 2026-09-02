import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import {
  LEGAL_LAST_UPDATED_LABEL,
  PRIVACY_CONTACT_EMAIL,
  SUPPORT_CONTACT_EMAIL,
} from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Termos de Uso — Aprendiz Bay",
  description:
    "Rascunho dos Termos de Uso da Aprendiz Bay, a plataforma brasileira de tutoria e aulas coletivas. Pendente de revisão jurídica.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermosPage() {
  return (
    <LegalDocument
      title="Termos de Uso"
      description="Estas condições regulam o uso da plataforma Aprendiz Bay por alunos, professores e visitantes. Ao criar uma conta ou usar o site, você declara que leu este documento."
    >
      <LegalSection id="aceitacao" title="1. Aceitação e natureza do serviço">
        <p>
          A Aprendiz Bay é uma plataforma digital brasileira que conecta, de forma
          independente, <strong>alunos</strong> e <strong>professores</strong> para
          aulas individuais e coletivas, presenciais ou online. A plataforma
          oferece ferramentas de busca, perfil, agendamento, mensagens e
          pagamento, mas <strong>não ministra as aulas em nome próprio</strong>.
        </p>
        <p>
          O contrato de prestação de serviços educacionais é celebrado diretamente
          entre aluno e professor. A Aprendiz Bay atua como intermediadora
          tecnológica (marketplace), e não como empregadora, sócia, preposta ou
          mandatária dos professores cadastrados. Professores definem preços,
          disponibilidade e conteúdo; alunos escolhem com quem estudar.
        </p>
        <p>
          A Aprendiz Bay não é instituição de ensino, não emite certificado
          oficial e <strong>não estabelece vínculo empregatício</strong> com
          professores, facilitadores de indicação ou demais usuários. A relação
          entre professor e plataforma é de parceria comercial/autônoma, sujeita
          a revisão jurídica quanto à forma societária aplicável.
        </p>
      </LegalSection>

      <LegalSection id="cadastro" title="2. Cadastro e conta">
        <p>
          Para reservar aulas, enviar mensagens ou se cadastrar como professor,
          é necessário criar uma conta com e-mail e senha ou com uma conta
          Google. Você deve informar dados verdadeiros, manter a senha em sigilo
          e ter pelo menos 18 anos — ou usar a plataforma com autorização e
          supervisão de responsável legal, se for menor.
        </p>
        <p>
          Há dois perfis principais: <strong>aluno</strong> e{" "}
          <strong>professor</strong>. O perfil de administrador não é aberto ao
          público e só é atribuído internamente. Cada pessoa é responsável pelo
          uso da própria conta.
        </p>
      </LegalSection>

      <LegalSection id="alunos" title="3. Regras para alunos">
        <p>
          O aluno pode buscar professores, solicitar reservas, pagar aulas
          aceitas, participar da aula no horário combinado e avaliar a
          experiência após a conclusão. O aluno deve comparecer pontualmente,
          tratar o professor com respeito e não gravar a aula sem autorização
          expressa.
        </p>
      </LegalSection>

      <LegalSection id="professores" title="4. Regras para professores">
        <p>
          O professor declara ter qualificação para as matérias que oferece,
          define preços e disponibilidade e pode abrir turmas coletivas. O
          perfil público só aparece na busca depois de aprovação da
          verificação pela plataforma (status <span className="font-medium">approved</span>).
          Perfis pendentes, recusados ou suspensos não aparecem como
          professores verificados. Documentos enviados para credenciamento
          devem ser autênticos e ficam visíveis só para o professor e
          administradores.
        </p>
        <p>
          O professor deve honrar reservas confirmadas, iniciar a sala online
          (quando aplicável) e cancelar com antecedência se não puder ministrar
          a aula. Cancelamento de aula já paga pelo professor gera estorno
          integral ao aluno.
        </p>
      </LegalSection>

      <LegalSection id="coletivas" title="5. Aulas coletivas">
        <p>
          Turmas coletivas (hubs) têm vagas limitadas e preço compartilhado
          informado no anúncio. Ao entrar em uma turma, o aluno ocupa uma vaga.
          A realização da aula depende do professor e das regras da turma. A
          plataforma pode encerrar turmas inativas ou de contas excluídas.
        </p>
      </LegalSection>

      <LegalSection id="pagamentos" title="6. Pagamentos e taxa da plataforma">
        <p>
          Depois que o professor aceita a reserva, o aluno realiza o pagamento
          por checkout hospedado do processador de pagamentos contratado pela
          plataforma. Conforme a configuração vigente do serviço, o processamento
          financeiro pode ser feito pelo <strong>Mercado Pago</strong> e/ou pelo{" "}
          <strong>Asaas</strong>. Na implantação atual, novos pagamentos podem
          ser direcionados prioritariamente ao Mercado Pago; a forma final de
          roteamento entre processadores deve ser confirmada na revisão jurídica
          e na comunicação ao usuário no momento do checkout.
        </p>
        <p>
          O checkout pode oferecer meios como PIX, cartão de crédito e outros
          disponibilizados pelo processador ativo. Uma taxa da plataforma
          (padrão de 10%, configurável) é destacada antes do pagamento e
          registrada na reserva como valor do professor e taxa da Aprendiz Bay.
        </p>
        <p>
          A confirmação da reserva como <strong>paga</strong> depende da
          confirmação do pagamento pelo processador (incluindo notificações
          automáticas de webhook). Pagamentos recusados, expirados ou cancelados
          não confirmam a aula. A Aprendiz Bay não armazena o número completo do
          cartão; dados de cobrança informados no checkout (como nome, e-mail,
          CPF e telefone) são tratados conforme a{" "}
          <Link href="/privacidade" className="font-medium text-primary-700 hover:text-primary-600">
            Política de Privacidade
          </Link>{" "}
          e as regras do processador de pagamentos utilizado.
        </p>
      </LegalSection>

      <LegalSection id="cancelamento" title="7. Cancelamento e reembolso">
        <p>
          As regras abaixo refletem o fluxo implementado na plataforma e podem
          ser ajustadas após revisão jurídica, desde que respeitados direitos
          irrenunciáveis do consumidor:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            reservas <strong>ainda não pagas</strong> podem ser canceladas pelo
            aluno ou pelo professor sem cobrança;
          </li>
          <li>
            reservas <strong>pagas</strong> só entram na política de estorno
            quando o status de pagamento da reserva é{" "}
            <span className="font-medium">paid</span> (pago confirmado pelo
            processador);
          </li>
          <li>
            o aluno tem cancelamento com <strong>estorno integral</strong> se
            cancelar com <strong>24 horas ou mais</strong> de antecedência em
            relação ao horário agendado da aula;
          </li>
          <li>
            cancelamento do aluno com <strong>menos de 24 horas</strong> de
            antecedência, em reserva já paga, não é permitido pela plataforma e{" "}
            <strong>não gera estorno automático</strong>, salvo determinação legal
            em contrário;
          </li>
          <li>
            se o professor cancelar uma aula já paga, o aluno recebe{" "}
            <strong>estorno integral</strong>, inclusive a menos de 24 horas;
          </li>
          <li>
            reservas já canceladas ou aulas já concluídas não podem ser
            canceladas novamente pela mesma reserva;
          </li>
          <li>
            o valor estornado nunca excede o valor efetivamente pago na reserva.
          </li>
        </ul>
        <p>
          Quando aplicável, o estorno é solicitado ao processador de pagamentos
          (Mercado Pago ou Asaas, conforme o pagamento original). O prazo para
          o crédito aparecer no extrato, na fatura do cartão ou na conta PIX
          depende do meio de pagamento e das regras do processador e da
          instituição financeira. A plataforma pode registrar o pedido de
          estorno e atualizar o status da reserva após a confirmação do
          processador.
        </p>
        <p>
          <strong>Revisão jurídica recomendada:</strong> validar se a política
          de 24 horas para o aluno atende integralmente ao Código de Defesa do
          Consumidor e se textos de exceção, chargeback e disputa precisam ser
          ampliados para cada processador.
        </p>
      </LegalSection>

      <LegalSection id="facilitadores" title="8. Programa de indicação (facilitadores)">
        <p>
          A Aprendiz Bay pode oferecer um programa de indicação para pessoas
          cadastradas como <strong>facilitadores</strong>, que divulgam a
          plataforma por meio de links próprios (por exemplo,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            aprendizbay.com.br/r/{"{codigo}"}
          </code>
          ).
        </p>
        <p>
          <strong>Rastreamento:</strong> ao acessar um link de indicação, a
          plataforma pode registrar o clique e armazenar um identificador de
          indicação em cookie ou parâmetro equivalente no dispositivo do
          visitante, pelo prazo informado na Política de Privacidade. Se o
          visitante criar conta, a indicação pode ser associada ao novo usuário,
          desde que ainda válida e não bloqueada por regras antifraude.
        </p>
        <p>
          <strong>Comissão:</strong> a comissão do facilitador, quando prevista,
          tende a ser creditada somente na <strong>primeira reserva paga</strong>{" "}
          do usuário indicado, após confirmação do pagamento pelo processador. A
          comissão permanece em status pendente durante um período de carência
          para reembolso (padrão de 7 dias após o pagamento, configurável) e
          só se torna disponível para repasse se não houver estorno da aula
          correspondente. Comissões podem ser estornadas ou anuladas se o
          pagamento subjacente for reembolsado.
        </p>
        <p>
          <strong>Fraude e autoindicação:</strong> são vedados autoindicação,
          indicações com e-mail, telefone ou CPF coincidentes com os do
          facilitador, contas duplicadas, indícios de fraude ou qualquer
          manipulação do programa. A plataforma pode recusar, cancelar ou não
          pagar comissões suspeitas, bloquear identidades repetidas e encerrar
          a participação do facilitador, sem prejuízo de outras medidas.
        </p>
        <p>
          Valores percentuais, prazos de repasse, elegibilidade e tributação das
          comissões devem ser confirmados em contrato ou regulamento específico
          do programa após <strong>revisão jurídica e contábil</strong>.
        </p>
      </LegalSection>

      <LegalSection id="avaliacoes" title="9. Avaliações e mensagens">
        <p>
          Avaliações exigem reserva concluída e devem ser honestas, sem ofensas
          ou dados de terceiros. A nota pública do professor é recalculada a
          partir dessas avaliações. Mensagens entre aluno e professor destinam-se
          apenas ao combinado da aula; spam, assédio ou conteúdo ilícito são
          proibidos.
        </p>
      </LegalSection>

      <LegalSection id="condutas" title="10. Condutas proibidas">
        <p>
          É vedado usar a plataforma para fraudar pagamentos, burlar a
          verificação de professores, publicar conteúdo discriminatório,
          ofensivo ou ilegal, coletar dados de outros usuários, atacar a
          segurança do sistema ou desviar reservas para fora da plataforma com
          o fim de evitar a taxa após o uso dos recursos de busca e agendamento.
        </p>
      </LegalSection>

      <LegalSection id="propriedade" title="11. Propriedade intelectual">
        <p>
          Marca, layout, textos institucionais e software da Aprendiz Bay
          pertencem à plataforma ou a seus licenciadores. O professor mantém
          os direitos sobre o conteúdo didático que cria, e concede à
          plataforma licença limitada para exibir o perfil, a bio e os
          materiais que ele próprio publica.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidade" title="12. Limitação de responsabilidade">
        <p>
          A qualidade pedagógica da aula, pontualidade e ambiente (online ou
          presencial) são de responsabilidade do professor e, no que couber, do
          aluno. A plataforma envida esforços razoáveis de disponibilidade e
          verificação, mas não garante resultado de aprendizado, aprovação em
          exames ou funcionamento ininterrupto de serviços de terceiros (Firebase,
          Mercado Pago, Asaas, salas de videoconferência).
        </p>
        <p>
          Nada neste rascunho afasta direitos irrenunciáveis do consumidor
          previstos no Código de Defesa do Consumidor.
        </p>
      </LegalSection>

      <LegalSection id="exclusao" title="13. Encerramento da conta">
        <p>
          Você pode solicitar a exclusão da conta em{" "}
          <Link href="/configuracoes" className="font-medium text-primary-700 hover:text-primary-600">
            Configurações
          </Link>
          . O documento <code className="rounded bg-muted px-1.5 py-0.5 text-sm">users/{"{uid}"}</code>{" "}
          é apagado. Reservas e avaliações são{" "}
          <strong>anonimizadas e mantidas</strong>, para preservar o histórico
          da outra parte, notas públicas e obrigações fiscais ou de defesa do
          consumidor. Mensagens e o perfil público de professor são
          anonimizados. A plataforma pode encerrar contas que violem estes
          Termos.
        </p>
        <p>
          A exclusão pode ser recusada temporariamente se existirem reservas
          pagas ainda pendentes ou confirmadas: cancele-as (ou aguarde a aula)
          antes de encerrar a conta.
        </p>
      </LegalSection>

      <LegalSection id="lei" title="14. Lei aplicável e foro">
        <p>
          Aplica-se a legislação brasileira, em especial o Código de Defesa do
          Consumidor, o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD
          (Lei nº 13.709/2018). Em relações de consumo, o foro é o do domicílio
          do usuário. Demais controvérsias serão submetidas ao foro competente
          no Brasil, a ser confirmado após revisão jurídica e definição da
          sede da pessoa jurídica.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="15. Contato e alterações">
        <p>
          Dúvidas sobre estes Termos:{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
          . Pedidos da LGPD:{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          . Podemos atualizar este documento; a data do rascunho vigente é{" "}
          {LEGAL_LAST_UPDATED_LABEL}. Uso continuado após a publicação de uma
          versão revisada juridicamente implica aceitação das novas condições,
          salvo direito de recusa com exclusão da conta.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
