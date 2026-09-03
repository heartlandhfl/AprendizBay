import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Termos de Uso | AprendizBay",
  description:
    "Termos de Uso da AprendizBay, a plataforma brasileira que conecta alunos e professores para aulas particulares e coletivas.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermosPage() {
  return (
    <LegalDocument
      variant="published"
      title="Termos de Uso"
      description="Bem-vindo à AprendizBay. Estes Termos de Uso regulam o acesso e a utilização da plataforma por alunos, professores e visitantes."
    >
      <p>
        Ao criar uma conta, solicitar ou reservar uma aula, cadastrar-se como
        professor ou utilizar os serviços da plataforma, você declara que leu e
        compreendeu estes Termos e concorda com eles, observada a legislação
        brasileira aplicável.
      </p>

      <LegalSection id="sobre" title="1. Sobre a AprendizBay">
        <p>
          A AprendizBay é uma plataforma digital brasileira que conecta alunos e
          professores para aulas particulares e coletivas, presenciais ou online.
        </p>
        <p>
          A plataforma oferece recursos tecnológicos que podem incluir busca de
          professores, criação e gestão de perfis, comunicação entre usuários,
          solicitação e gerenciamento de reservas, pagamentos, avaliações e outros
          recursos relacionados à contratação de aulas.
        </p>
        <p>
          A AprendizBay atua como plataforma de intermediação tecnológica entre
          alunos e professores. O serviço educacional objeto de cada reserva é
          prestado pelo professor responsável pela aula, e as condições
          específicas da aula são apresentadas ao aluno antes da contratação.
        </p>
        <p>
          A AprendizBay não é instituição de ensino e não substitui o professor na
          prestação do serviço educacional. A plataforma também não garante
          determinado resultado acadêmico, aprovação em provas ou exames ou
          qualquer resultado específico de aprendizagem.
        </p>
        <p>
          Nada nestes Termos exclui ou limita direitos ou responsabilidades que
          não possam ser excluídos ou limitados pela legislação brasileira.
        </p>
      </LegalSection>

      <LegalSection id="cadastro" title="2. Cadastro e conta">
        <p>
          Algumas funcionalidades da plataforma exigem a criação de uma conta.
        </p>
        <p>
          Para criar e utilizar uma conta, o usuário deve fornecer informações
          verdadeiras, completas e atualizadas e manter seus dados de acesso
          protegidos.
        </p>
        <p>
          A conta é pessoal e não deve ser compartilhada com terceiros. O usuário
          é responsável pelas atividades realizadas por meio de sua conta, salvo
          quando demonstrar que não deu causa ao uso indevido.
        </p>
        <p>
          A AprendizBay poderá solicitar informações adicionais quando
          necessárias para segurança, prevenção de fraude, verificação de
          identidade, credenciamento de professores ou cumprimento de obrigações
          legais.
        </p>
        <p>
          O cadastro como professor está sujeito às condições específicas
          aplicáveis a essa categoria de usuário.
        </p>
      </LegalSection>

      <LegalSection id="menores" title="3. Idade e participação de menores">
        <p>
          A plataforma pode ser utilizada por pessoas menores de 18 anos nas
          condições permitidas pela legislação brasileira e mediante a
          participação ou autorização do responsável legal quando exigida.
        </p>
        <p>
          Quando necessário, a AprendizBay poderá solicitar informações ou
          procedimentos destinados a verificar a autorização do responsável
          legal.
        </p>
        <p>
          Pais e responsáveis devem supervisionar a utilização da plataforma por
          crianças e adolescentes e são responsáveis por acompanhar as reservas,
          comunicações e demais atividades realizadas em seu nome quando
          aplicável.
        </p>
        <p>
          A AprendizBay adotará medidas compatíveis com a legislação brasileira
          para proteção de crianças e adolescentes e de seus dados pessoais.
        </p>
      </LegalSection>

      <LegalSection id="alunos" title="4. Regras para alunos">
        <p>O aluno pode, conforme as funcionalidades disponíveis:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>pesquisar professores;</li>
          <li>consultar perfis, disciplinas, preços e disponibilidade;</li>
          <li>solicitar ou realizar reservas;</li>
          <li>efetuar pagamentos;</li>
          <li>participar das aulas;</li>
          <li>enviar e receber mensagens relacionadas às aulas; e</li>
          <li>avaliar aulas e professores após sua conclusão.</li>
        </ul>
        <p>O aluno deve:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>fornecer informações verdadeiras;</li>
          <li>respeitar professores e demais usuários;</li>
          <li>comparecer às aulas nos horários combinados;</li>
          <li>utilizar a plataforma de forma lícita e responsável;</li>
          <li>não compartilhar indevidamente dados pessoais de terceiros; e</li>
          <li>
            não gravar, reproduzir ou distribuir aulas ou comunicações sem
            autorização, salvo quando permitido pela legislação aplicável.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="professores" title="5. Regras para professores">
        <p>
          O professor declara que possui qualificação, experiência ou
          conhecimento compatível com as disciplinas e serviços que anuncia na
          plataforma.
        </p>
        <p>O professor é responsável por:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>manter suas informações profissionais atualizadas;</li>
          <li>
            informar corretamente suas qualificações, experiência, disciplinas,
            preços e disponibilidade;
          </li>
          <li>cumprir as reservas que aceitar;</li>
          <li>prestar as aulas conforme anunciado;</li>
          <li>comunicar e cancelar compromissos que não possa cumprir;</li>
          <li>respeitar alunos e demais usuários; e</li>
          <li>
            fornecer informações verdadeiras e documentos autênticos quando
            solicitados para verificação.
          </li>
        </ul>
        <p>
          A AprendizBay poderá realizar procedimentos de verificação e poderá
          aprovar, recusar, suspender ou retirar um perfil da divulgação pública
          quando houver motivo legítimo, inclusive inconsistências nas
          informações fornecidas, suspeita de fraude, descumprimento destes
          Termos ou necessidade de proteção dos usuários.
        </p>
        <p>
          A verificação realizada pela AprendizBay não constitui garantia
          absoluta da qualificação, conduta ou qualidade futura do professor.
        </p>
        <p>
          Documentos enviados para fins de credenciamento serão tratados de
          acordo com a{" "}
          <Link
            href="/privacidade"
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            Política de Privacidade
          </Link>{" "}
          e ficarão sujeitos às medidas de segurança e acesso aplicáveis.
        </p>
        <p>
          Quando uma aula já paga for cancelada pelo professor, serão aplicadas
          as regras de cancelamento e reembolso descritas nestes Termos e na
          legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection id="coletivas" title="6. Aulas coletivas">
        <p>
          A AprendizBay poderá oferecer funcionalidades para criação e
          participação em aulas coletivas ou turmas.
        </p>
        <p>
          Cada anúncio informará, quando aplicável, o número de vagas, preço,
          horário, professor e demais condições relevantes.
        </p>
        <p>
          A entrada do aluno em uma turma poderá ocupar uma das vagas
          disponíveis.
        </p>
        <p>
          A realização, alteração ou cancelamento de uma aula coletiva observará
          as condições informadas no anúncio, estes Termos e a legislação
          aplicável.
        </p>
        <p>
          A AprendizBay poderá encerrar ou remover turmas inativas,
          indisponíveis ou associadas a contas suspensas ou encerradas,
          respeitando as obrigações existentes perante os usuários.
        </p>
      </LegalSection>

      <LegalSection id="pagamentos" title="7. Preços, pagamentos e taxa da plataforma">
        <p>
          Os preços das aulas são definidos pelos professores, salvo quando
          expressamente indicado de outra forma.
        </p>
        <p>
          Antes da conclusão do pagamento, o usuário verá o valor aplicável à
          reserva e eventuais taxas cobradas pela plataforma.
        </p>
        <p>
          A AprendizBay poderá cobrar uma taxa de intermediação ou utilização da
          plataforma. Quando aplicável, o valor ou percentual da taxa será
          informado ao usuário antes da conclusão do pagamento.
        </p>
        <p>
          Os pagamentos são processados por provedores de pagamento
          disponibilizados pela AprendizBay e identificados no momento do
          checkout.
        </p>
        <p>
          Os meios de pagamento disponíveis poderão incluir PIX, cartão de
          crédito e outros métodos disponibilizados pelo processador de
          pagamentos.
        </p>
        <p>
          A confirmação de uma reserva como paga depende da confirmação do
          pagamento pelo respectivo provedor.
        </p>
        <p>
          Pagamentos recusados, expirados, cancelados ou não confirmados não
          serão considerados pagamentos concluídos para fins de confirmação da
          reserva.
        </p>
        <p>
          A AprendizBay não armazena o número completo do cartão de pagamento. Os
          dados necessários para processamento, cobrança, prevenção de fraude e
          demais finalidades relacionadas ao pagamento poderão ser tratados pelo
          respectivo provedor de pagamento, de acordo com suas próprias
          políticas e com a legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection id="cancelamento" title="8. Cancelamento, remarcação e reembolso">
        <p>
          As regras de cancelamento e reembolso aplicam-se às reservas realizadas
          pela plataforma, sem prejuízo dos direitos assegurados pela legislação
          brasileira.
        </p>
        <p>Como regra operacional da plataforma:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            reservas ainda não pagas poderão ser canceladas antes da confirmação
            do pagamento;
          </li>
          <li>
            reservas pagas estarão sujeitas às condições de cancelamento
            apresentadas ao usuário;
          </li>
          <li>
            o aluno poderá solicitar cancelamento com antecedência mínima de 24
            horas para obter o reembolso previsto na política da plataforma;
          </li>
          <li>
            cancelamentos realizados com menos de 24 horas de antecedência
            poderão estar sujeitos às condições específicas informadas no momento
            da reserva;
          </li>
          <li>
            quando o professor cancelar uma aula já paga, o aluno terá direito ao
            reembolso aplicável, observada a legislação vigente;
          </li>
          <li>
            reservas já canceladas ou concluídas não poderão ser canceladas
            novamente pela mesma operação; e
          </li>
          <li>
            nenhum reembolso será superior ao valor efetivamente pago pelo
            usuário em relação à reserva correspondente.
          </li>
        </ul>
        <p>
          <strong>
            As regras acima não afastam direitos legais do consumidor.
          </strong>{" "}
          Quando houver direito de arrependimento, cancelamento, restituição ou
          outro direito previsto em norma obrigatória, ele prevalecerá sobre
          qualquer regra operacional destes Termos.
        </p>
        <p>
          Quando aplicável, o pedido de reembolso será encaminhado ao provedor de
          pagamento utilizado na transação.
        </p>
        <p>
          O prazo para que o valor seja efetivamente disponibilizado ao usuário
          poderá depender do meio de pagamento, do provedor de pagamento e da
          instituição financeira envolvida.
        </p>
      </LegalSection>

      <LegalSection id="indicacao" title="9. Programa de indicação">
        <p>
          A AprendizBay poderá oferecer programa de indicação ou parceria para
          usuários autorizados a divulgar a plataforma por meio de links ou
          códigos próprios.
        </p>
        <p>
          Quando o programa estiver disponível, suas condições específicas,
          incluindo critérios de elegibilidade, comissão, prazo de confirmação,
          regras de pagamento e hipóteses de cancelamento, poderão ser
          estabelecidas em regulamento próprio.
        </p>
        <p>
          São proibidas autoindicações, contas duplicadas criadas
          artificialmente, manipulação de links ou códigos, fraude, uso indevido
          de dados de terceiros ou qualquer tentativa de obter comissões de
          maneira artificial.
        </p>
        <p>
          A AprendizBay poderá investigar, suspender ou cancelar indicações e
          comissões que apresentem indícios de fraude ou descumprimento das
          regras aplicáveis.
        </p>
      </LegalSection>

      <LegalSection id="avaliacoes" title="10. Avaliações e mensagens">
        <p>As avaliações devem representar a experiência real do usuário.</p>
        <p>É proibido utilizar avaliações ou mensagens para:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>ameaçar, assediar ou intimidar outras pessoas;</li>
          <li>publicar conteúdo discriminatório ou ilegal;</li>
          <li>divulgar dados pessoais de terceiros sem autorização;</li>
          <li>publicar spam ou publicidade não autorizada;</li>
          <li>manipular artificialmente avaliações; ou</li>
          <li>
            praticar qualquer outra conduta proibida por estes Termos ou pela
            legislação brasileira.
          </li>
        </ul>
        <p>
          A AprendizBay poderá moderar, ocultar ou remover conteúdo que viole
          estes Termos ou a legislação aplicável.
        </p>
        <p>
          As mensagens disponibilizadas pela plataforma destinam-se
          principalmente à comunicação relacionada às aulas e à utilização dos
          serviços.
        </p>
      </LegalSection>

      <LegalSection id="condutas" title="11. Condutas proibidas">
        <p>É proibido utilizar a AprendizBay para:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>fraudar ou tentar fraudar pagamentos;</li>
          <li>criar contas falsas ou duplicadas;</li>
          <li>utilizar identidade ou dados de terceiros sem autorização;</li>
          <li>burlar mecanismos de verificação;</li>
          <li>
            atacar, testar ou comprometer a segurança da plataforma sem
            autorização;
          </li>
          <li>
            introduzir vírus, códigos maliciosos ou outros mecanismos destinados
            a prejudicar sistemas;
          </li>
          <li>coletar dados de outros usuários de forma indevida;</li>
          <li>
            publicar conteúdo ilegal, discriminatório, ameaçador ou ofensivo;
          </li>
          <li>praticar assédio ou abuso;</li>
          <li>utilizar a plataforma para atividades fraudulentas;</li>
          <li>manipular reservas, avaliações, pagamentos ou comissões; ou</li>
          <li>
            utilizar os recursos da plataforma para desviar deliberadamente uma
            contratação para fora dela com o objetivo de evitar taxas devidas à
            AprendizBay.
          </li>
        </ul>
        <p>
          A AprendizBay poderá adotar medidas proporcionais à gravidade da
          conduta, incluindo advertência, remoção de conteúdo, suspensão de
          funcionalidades, cancelamento de reservas ou encerramento da conta,
          observada a legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection id="propriedade" title="12. Propriedade intelectual">
        <p>
          A marca AprendizBay, seu nome, identidade visual, software, código,
          layout, textos institucionais e demais elementos desenvolvidos pela
          plataforma pertencem à AprendizBay ou aos respectivos licenciadores,
          conforme aplicável.
        </p>
        <p>
          É proibida a reprodução, distribuição, modificação ou exploração
          comercial desses elementos sem autorização.
        </p>
        <p>
          O professor mantém os direitos sobre os conteúdos didáticos e demais
          materiais de sua autoria que publicar na plataforma.
        </p>
        <p>
          Ao publicar conteúdo na AprendizBay, o usuário concede à plataforma
          uma licença não exclusiva, limitada ao necessário para hospedar,
          reproduzir, exibir e disponibilizar esse conteúdo dentro das
          funcionalidades da plataforma e para divulgação relacionada aos
          serviços, sempre respeitados os direitos do autor e a legislação
          aplicável.
        </p>
      </LegalSection>

      <LegalSection id="terceiros" title="13. Disponibilidade e serviços de terceiros">
        <p>
          A AprendizBay envidará esforços razoáveis para manter a plataforma
          disponível e funcionando adequadamente.
        </p>
        <p>
          Entretanto, determinados recursos dependem de serviços de terceiros,
          incluindo provedores de hospedagem, autenticação, pagamentos,
          comunicação e videoconferência.
        </p>
        <p>
          A indisponibilidade temporária de um serviço de terceiro poderá afetar
          determinadas funcionalidades da plataforma.
        </p>
        <p>
          A AprendizBay não garante funcionamento ininterrupto, ausência
          absoluta de erros ou disponibilidade permanente de todos os serviços.
        </p>
        <p>
          Isso não prejudica os direitos do consumidor ou outras
          responsabilidades legalmente aplicáveis à AprendizBay.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidades" title="14. Responsabilidades relacionadas às aulas">
        <p>
          O professor é responsável pela preparação e execução do conteúdo
          educacional que oferece, bem como pelas informações profissionais que
          apresenta em seu perfil.
        </p>
        <p>
          O aluno é responsável pelas informações fornecidas, por seu
          comportamento durante as aulas e pelo cumprimento de suas obrigações
          relacionadas à reserva.
        </p>
        <p>
          A AprendizBay oferece a infraestrutura tecnológica para facilitar a
          relação entre as partes, mas não controla todos os aspectos da
          interação ou da prestação da aula.
        </p>
        <p>
          A plataforma poderá, entretanto, adotar medidas de segurança,
          moderação, verificação, prevenção de fraude e atendimento quando
          necessário.
        </p>
        <p>
          Nada nesta seção limita direitos ou responsabilidades previstos na
          legislação brasileira.
        </p>
      </LegalSection>

      <LegalSection id="seguranca" title="15. Segurança e uso responsável">
        <p>
          O usuário deve manter seus dispositivos, credenciais e métodos de
          acesso protegidos.
        </p>
        <p>
          Caso suspeite de acesso não autorizado à sua conta, deverá comunicar a
          AprendizBay imediatamente por meio do canal de contato
          disponibilizado.
        </p>
        <p>
          A AprendizBay poderá adotar medidas de segurança e prevenção de fraude,
          incluindo análise de atividades suspeitas e restrição temporária de
          determinadas funcionalidades quando necessário para proteger usuários,
          pagamentos ou a própria plataforma.
        </p>
      </LegalSection>

      <LegalSection id="exclusao" title="16. Exclusão e encerramento da conta">
        <p>
          O usuário poderá solicitar a exclusão de sua conta por meio das
          funcionalidades disponibilizadas pela plataforma ou entrando em contato
          com a AprendizBay.
        </p>
        <p>
          A exclusão da conta não significa necessariamente a eliminação imediata
          de todas as informações relacionadas ao usuário.
        </p>
        <p>
          Determinados dados poderão ser mantidos quando houver fundamento legal
          para isso, inclusive para cumprimento de obrigações legais ou
          regulatórias, exercício regular de direitos, prevenção de fraude,
          resolução de disputas ou preservação de registros necessários.
        </p>
        <p>
          Quando tecnicamente e legalmente aplicável, informações relacionadas a
          reservas, avaliações e outras interações poderão ser anonimizadas em
          vez de integralmente eliminadas, de modo a preservar registros
          necessários sem manter a identificação direta do usuário.
        </p>
        <p>
          A AprendizBay poderá suspender ou encerrar contas em caso de violação
          destes Termos, fraude, risco de segurança, atividade ilegal ou outras
          situações justificadas.
        </p>
        <p>
          Quando apropriado, o usuário poderá solicitar esclarecimentos sobre a
          medida adotada por meio do canal de contato da plataforma.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="17. Proteção de dados pessoais">
        <p>
          O tratamento de dados pessoais realizado pela AprendizBay é descrito na{" "}
          <Link
            href="/privacidade"
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            Política de Privacidade
          </Link>{" "}
          da plataforma.
        </p>
        <p>
          A Política de Privacidade informa, entre outros aspectos, quais dados
          podem ser coletados, para quais finalidades podem ser utilizados, com
          quem podem ser compartilhados, os períodos de retenção aplicáveis e os
          direitos dos titulares.
        </p>
        <p>
          Solicitações relacionadas a dados pessoais e ao exercício de direitos
          previstos na LGPD podem ser encaminhadas para:{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection id="comunicacoes" title="18. Comunicações">
        <p>
          A AprendizBay poderá enviar comunicações necessárias à prestação dos
          serviços, incluindo confirmações de cadastro, reservas, pagamentos,
          cancelamentos, alterações de conta, segurança e atendimento.
        </p>
        <p>
          Comunicações promocionais serão tratadas de acordo com as opções
          disponibilizadas ao usuário e com a legislação aplicável.
        </p>
        <p>
          O usuário poderá solicitar informações ou atendimento pelo endereço:{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="19. Alterações destes Termos">
        <p>
          A AprendizBay poderá atualizar estes Termos para refletir alterações na
          plataforma, nos serviços oferecidos, na legislação ou nas práticas
          operacionais.
        </p>
        <p>
          A versão vigente será disponibilizada na plataforma com sua respectiva
          data de atualização.
        </p>
        <p>
          Alterações relevantes poderão ser comunicadas aos usuários por meios
          razoáveis, especialmente quando puderem afetar direitos ou obrigações.
        </p>
        <p>
          A continuidade da utilização da plataforma após a entrada em vigor de
          uma nova versão significará a ciência dos Termos atualizados, sem
          prejuízo dos direitos que não possam ser afastados por esse mecanismo.
        </p>
      </LegalSection>

      <LegalSection id="lei" title="20. Lei aplicável e solução de controvérsias">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
        </p>
        <p>
          As relações de consumo serão interpretadas e executadas em conformidade
          com a legislação brasileira aplicável, incluindo o Código de Defesa do
          Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados
          Pessoais.
        </p>
        <p>
          Nas relações de consumo, será respeitado o foro legalmente competente,
          inclusive o foro assegurado ao consumidor pela legislação aplicável.
        </p>
        <p>
          Nada nestes Termos impede o usuário de exercer direitos perante órgãos
          administrativos, autoridades competentes ou o Poder Judiciário.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="21. Contato">
        <p>
          Para dúvidas, reclamações, solicitações relacionadas à conta,
          pagamentos, reservas, estes Termos ou questões de privacidade e
          proteção de dados pessoais:{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <footer className="border-t border-border pt-8 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">AprendizBay</p>
        <p className="mt-1">
          Plataforma brasileira que conecta alunos e professores com aulas
          particulares e coletivas.
        </p>
        <p className="mt-4">© 2026 AprendizBay. Todos os direitos reservados.</p>
      </footer>
    </LegalDocument>
  );
}
