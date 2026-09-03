import type { ReactNode } from "react";
import Link from "next/link";
import { LegalSection } from "@/components/legal/LegalDocument";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-foreground">{children}</h3>;
}

export default function PrivacyPolicyBody() {
  return (
    <>
      <p>
        A AprendizBay valoriza a privacidade e a proteção dos dados pessoais de seus usuários.
      </p>
      <p>
        Esta Política de Privacidade explica, de forma transparente, quais dados pessoais podem
        ser tratados pela AprendizBay, para quais finalidades, quais são as bases legais
        aplicáveis, com quem os dados podem ser compartilhados, por quanto tempo podem ser
        mantidos e como você pode exercer seus direitos.
      </p>
      <p>
        Esta Política aplica-se ao uso do site, da plataforma e dos serviços disponibilizados
        pela AprendizBay.
      </p>

      <LegalSection id="controlador" title="1. Quem somos e quem controla seus dados">
        <p>
          A AprendizBay é uma plataforma digital brasileira que conecta alunos e professores para
          aulas particulares e coletivas.
        </p>
        <p>
          Para os tratamentos de dados pessoais realizados pela AprendizBay como responsável pelas
          finalidades aqui descritas, a AprendizBay atua como <strong>controladora</strong> dos
          dados pessoais.
        </p>
        <p>
          As informações de identificação da pessoa jurídica responsável pela plataforma, incluindo
          razão social, CNPJ e endereço, serão disponibilizadas nesta página tão logo estejam
          formalmente definidas e cadastradas.
        </p>

        <Subheading>Canal de privacidade e atendimento</Subheading>
        <p>
          Para dúvidas, solicitações relacionadas a dados pessoais, exercício de direitos
          previstos na LGPD, questões de segurança ou qualquer outro assunto relacionado à
          plataforma:
        </p>
        <p>
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          Esse é o canal único de contato da AprendizBay para assuntos gerais e de privacidade.
        </p>
        <p>
          Quando aplicável, a AprendizBay também divulgará nesta página as informações de contato
          do Encarregado pelo tratamento de dados pessoais (DPO), conforme a estrutura e as
          obrigações aplicáveis à organização.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="2. Quais dados pessoais podemos tratar">
        <p>Os dados tratados dependem da forma como você utiliza a plataforma.</p>

        <Subheading>2.1. Dados de cadastro e autenticação</Subheading>
        <p>Podemos tratar:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>nome ou nome de exibição;</li>
          <li>endereço de e-mail;</li>
          <li>senha e informações técnicas necessárias à autenticação;</li>
          <li>
            identificadores associados à autenticação por serviços de terceiros, como Google;
          </li>
          <li>foto de perfil, quando fornecida;</li>
          <li>tipo de perfil, como aluno ou professor.</li>
        </ul>
        <p>
          As senhas não são armazenadas pela AprendizBay em formato de texto aberto. Os mecanismos
          de autenticação utilizados pela plataforma aplicam medidas técnicas apropriadas para
          proteção das credenciais.
        </p>

        <Subheading>2.2. Dados do perfil de professor</Subheading>
        <p>Quando você se cadastra como professor, podemos tratar:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>disciplinas oferecidas;</li>
          <li>cidade e estado;</li>
          <li>apresentação profissional e biografia;</li>
          <li>metodologia de ensino;</li>
          <li>preços;</li>
          <li>disponibilidade;</li>
          <li>foto;</li>
          <li>informações profissionais fornecidas para o perfil; e</li>
          <li>
            documentos ou informações utilizados para processos de verificação e credenciamento.
          </li>
        </ul>
        <p>
          Informações necessárias à verificação de professores podem receber tratamento
          diferenciado e acesso restrito.
        </p>

        <Subheading>2.3. Dados relacionados às aulas e reservas</Subheading>
        <p>
          Podemos tratar informações relacionadas às atividades realizadas na plataforma,
          incluindo:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>solicitações e reservas;</li>
          <li>datas e horários das aulas;</li>
          <li>status das reservas;</li>
          <li>participação em aulas coletivas;</li>
          <li>informações necessárias para disponibilização de salas online;</li>
          <li>avaliações;</li>
          <li>mensagens relacionadas às aulas;</li>
          <li>valores das reservas;</li>
          <li>taxas da plataforma;</li>
          <li>informações sobre cancelamentos e reembolsos.</li>
        </ul>

        <Subheading>2.4. Dados relacionados a pagamentos</Subheading>
        <p>
          Os pagamentos realizados pela plataforma podem ser processados por provedores de
          pagamento contratados pela AprendizBay.
        </p>
        <p>Dependendo do método de pagamento e da configuração vigente, o checkout poderá solicitar informações como:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>nome;</li>
          <li>e-mail;</li>
          <li>CPF;</li>
          <li>telefone;</li>
          <li>endereço, quando necessário;</li>
          <li>informações necessárias à identificação e processamento da transação.</li>
        </ul>
        <p>
          A AprendizBay poderá manter identificadores da cobrança, da transação, do checkout, do
          pagamento e do reembolso necessários à operação da plataforma.
        </p>
        <p>
          A AprendizBay <strong>não armazena o número completo do cartão de pagamento</strong> em
          seus próprios sistemas.
        </p>
        <p>
          Os dados inseridos diretamente no ambiente do provedor de pagamento também estarão
          sujeitos às políticas de privacidade e aos termos desse provedor.
        </p>

        <Subheading>2.5. Programa de indicação</Subheading>
        <p>Quando o programa de indicação de facilitadores estiver disponível, podemos tratar:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>códigos de indicação;</li>
          <li>informações relacionadas a acessos por links de indicação;</li>
          <li>associação de uma indicação a uma nova conta;</li>
          <li>informações necessárias para prevenção de fraude;</li>
          <li>status de comissões;</li>
          <li>valores de comissões e repasses;</li>
          <li>informações necessárias à administração do programa.</li>
        </ul>

        <Subheading>2.6. Dados técnicos e de segurança</Subheading>
        <p>
          Podemos tratar informações técnicas necessárias para funcionamento e segurança da
          plataforma, incluindo:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>endereço IP;</li>
          <li>informações de dispositivo e navegador;</li>
          <li>registros técnicos;</li>
          <li>identificadores de sessão;</li>
          <li>informações sobre eventos de segurança;</li>
          <li>preferências relacionadas a cookies;</li>
          <li>
            registros necessários para prevenção e investigação de fraude e abuso.
          </li>
        </ul>
        <p>
          Essas informações são utilizadas de forma compatível com as finalidades descritas nesta
          Política e com a legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" title="3. Para que utilizamos seus dados">
        <p>Podemos utilizar dados pessoais para:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>criar e administrar contas;</li>
          <li>autenticar usuários;</li>
          <li>permitir o acesso às funcionalidades da plataforma;</li>
          <li>exibir perfis de professores;</li>
          <li>permitir que alunos encontrem professores;</li>
          <li>gerenciar reservas e aulas;</li>
          <li>permitir comunicação entre alunos e professores;</li>
          <li>processar pagamentos, cancelamentos e reembolsos;</li>
          <li>disponibilizar aulas online;</li>
          <li>administrar aulas coletivas;</li>
          <li>permitir avaliações;</li>
          <li>calcular e apresentar avaliações e classificações de professores;</li>
          <li>verificar professores e informações profissionais;</li>
          <li>administrar programas de indicação;</li>
          <li>prevenir fraude, abuso e atividades ilícitas;</li>
          <li>proteger a segurança da plataforma;</li>
          <li>solucionar problemas técnicos;</li>
          <li>prestar atendimento e suporte;</li>
          <li>cumprir obrigações legais e regulatórias;</li>
          <li>
            exercer e defender direitos em processos judiciais, administrativos ou arbitrais;
          </li>
          <li>
            cumprir obrigações relacionadas a pagamentos, registros e questões fiscais; e
          </li>
          <li>melhorar a segurança, estabilidade e funcionamento da plataforma.</li>
        </ul>
        <p>
          A AprendizBay <strong>não vende dados pessoais</strong>.
        </p>
      </LegalSection>

      <LegalSection id="bases" title="4. Bases legais">
        <p>
          O tratamento de dados pessoais será realizado com fundamento em uma ou mais bases legais
          previstas na Lei Geral de Proteção de Dados Pessoais (LGPD), conforme a finalidade
          específica.
        </p>
        <p>Entre elas podem estar:</p>

        <Subheading>Execução de contrato</Subheading>
        <p>
          Utilizada quando o tratamento é necessário para criar e administrar a conta, permitir
          reservas, disponibilizar aulas, processar pagamentos, permitir comunicação entre
          usuários e executar outros serviços solicitados pelo usuário.
        </p>

        <Subheading>Cumprimento de obrigação legal ou regulatória</Subheading>
        <p>
          Utilizada quando a manutenção ou utilização de determinados dados é necessária para
          cumprir obrigações impostas por lei ou regulamentação.
        </p>

        <Subheading>Legítimo interesse</Subheading>
        <p>
          Pode ser utilizado, quando aplicável e após a avaliação de necessidade e balanceamento
          dos interesses envolvidos, para finalidades como:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>prevenção e investigação de fraude;</li>
          <li>segurança da plataforma;</li>
          <li>prevenção de abuso;</li>
          <li>proteção de contas e transações;</li>
          <li>manutenção da integridade de reservas e avaliações;</li>
          <li>melhoria e estabilidade dos serviços; e</li>
          <li>exercício regular de direitos.</li>
        </ul>

        <Subheading>Consentimento</Subheading>
        <p>
          Quando exigido pela legislação, determinados tratamentos poderão depender do
          consentimento do titular.
        </p>
        <p>
          Quando o tratamento depender de consentimento, o titular poderá revogá-lo nos termos da
          LGPD.
        </p>
        <p>
          A revogação não invalida tratamentos realizados anteriormente de forma legítima.
        </p>
      </LegalSection>

      <LegalSection id="sensiveis" title="5. Dados pessoais sensíveis">
        <p>
          A AprendizBay não tem como finalidade habitual o tratamento de dados pessoais sensíveis.
        </p>
        <p>
          Solicitamos que os usuários não incluam em perfis, mensagens, avaliações ou documentos
          informações sensíveis que não sejam necessárias para a utilização do serviço.
        </p>
        <p>
          Quando dados pessoais sensíveis forem tratados excepcionalmente, o tratamento será
          realizado somente quando houver fundamento legal adequado e serão adotadas as medidas
          exigidas pela legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection id="compartilhamento" title="6. Compartilhamento de dados">
        <p>
          A AprendizBay poderá compartilhar dados pessoais com fornecedores e parceiros quando
          isso for necessário para funcionamento da plataforma ou para cumprimento das finalidades
          descritas nesta Política.
        </p>
        <p>Entre as categorias de destinatários podem estar:</p>

        <Subheading>Serviços de tecnologia e infraestrutura</Subheading>
        <p>
          Provedores responsáveis por serviços de autenticação, banco de dados, armazenamento,
          hospedagem, segurança e infraestrutura tecnológica.
        </p>

        <Subheading>Processadores de pagamento</Subheading>
        <p>
          Provedores responsáveis por checkout, processamento de pagamentos, PIX, cartões,
          confirmação de transações, cancelamentos e reembolsos.
        </p>
        <p>
          O provedor efetivamente utilizado poderá variar conforme a configuração e o método de
          pagamento disponível no momento da transação.
        </p>

        <Subheading>Serviços de comunicação e aulas online</Subheading>
        <p>
          Quando uma aula online for disponibilizada por meio de serviço de videoconferência ou
          tecnologia semelhante, poderão ser compartilhadas as informações mínimas necessárias para
          criação e funcionamento da sala.
        </p>

        <Subheading>Prestadores de serviços profissionais</Subheading>
        <p>
          Quando necessário, dados poderão ser compartilhados com prestadores que auxiliem a
          AprendizBay em atividades como contabilidade, suporte, segurança, prevenção de fraude,
          tecnologia, atendimento ou assessoria jurídica, sempre observados os requisitos legais
          aplicáveis.
        </p>

        <Subheading>Autoridades públicas</Subheading>
        <p>
          Dados poderão ser fornecidos quando houver obrigação legal, ordem judicial, requisição
          de autoridade competente ou outra hipótese legalmente autorizada.
        </p>
        <p>
          A AprendizBay procura limitar o compartilhamento às informações necessárias para cada
          finalidade.
        </p>
      </LegalSection>

      <LegalSection id="transferencias" title="7. Transferências internacionais de dados">
        <p>
          Alguns dos fornecedores de tecnologia utilizados pela AprendizBay podem operar ou
          armazenar dados fora do Brasil.
        </p>
        <p>
          Quando uma operação caracterizar transferência internacional de dados pessoais, a
          AprendizBay adotará mecanismo de transferência permitido pela LGPD e pela regulamentação
          aplicável da Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
        <p>
          Isso poderá incluir, conforme o caso, decisão de adequação, cláusulas-padrão contratuais,
          cláusulas contratuais específicas, normas corporativas globais ou outro mecanismo
          reconhecido pela legislação e pela ANPD.
        </p>
        <p>
          A AprendizBay adotará medidas razoáveis para assegurar que os dados pessoais permaneçam
          protegidos durante essas transferências.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies e tecnologias semelhantes">
        <p>
          A AprendizBay utiliza cookies e tecnologias semelhantes para permitir o funcionamento da
          plataforma, manter sessões autenticadas, guardar determinadas preferências e proteger o
          serviço.
        </p>

        <Subheading>Cookies necessários</Subheading>
        <p>Alguns cookies ou identificadores são necessários para:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>manter o usuário autenticado;</li>
          <li>permitir o funcionamento da plataforma;</li>
          <li>proteger sessões;</li>
          <li>guardar determinadas preferências;</li>
          <li>prevenir atividades fraudulentas ou abusivas.</li>
        </ul>
        <p>Esses recursos são necessários para determinadas funcionalidades essenciais.</p>

        <Subheading>Cookies de indicação</Subheading>
        <p>
          Quando o programa de indicação estiver ativo, a AprendizBay poderá utilizar um
          identificador de indicação, como{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">ab_referral_code</code>, ou
          tecnologia equivalente, para associar uma visita a um facilitador.
        </p>
        <p>
          Quando aplicável, esse identificador poderá permanecer no dispositivo por período
          limitado, normalmente de até 30 dias, exclusivamente para fins relacionados à atribuição
          da indicação e ao funcionamento do programa.
        </p>

        <Subheading>Cookies opcionais</Subheading>
        <p>
          Cookies destinados a métricas não essenciais, publicidade ou marketing somente serão
          utilizados quando efetivamente habilitados na plataforma e de acordo com as escolhas e
          permissões exigidas pela legislação aplicável.
        </p>
        <p>
          O usuário poderá alterar suas preferências de cookies por meio das ferramentas
          disponibilizadas pela AprendizBay.
        </p>
        <p>
          A recusa de cookies opcionais não deverá impedir o acesso às funcionalidades essenciais
          da plataforma.
        </p>
      </LegalSection>

      <LegalSection id="retencao" title="9. Retenção e eliminação dos dados">
        <p>
          A AprendizBay mantém dados pessoais pelo período necessário para cumprir as finalidades
          descritas nesta Política, atender obrigações legais ou regulatórias, prevenir fraude,
          resolver disputas e exercer ou defender direitos.
        </p>
        <p>O período de retenção pode variar conforme:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>o tipo de dado;</li>
          <li>a finalidade do tratamento;</li>
          <li>a existência de obrigações legais;</li>
          <li>a existência de transações financeiras;</li>
          <li>a necessidade de prevenção de fraude;</li>
          <li>a existência de disputas ou processos; e</li>
          <li>outros fundamentos legais aplicáveis.</li>
        </ul>
        <p>
          Quando o usuário solicita a exclusão da conta, os dados que não precisarem mais ser
          mantidos serão eliminados, anonimizados ou tratados de outra forma permitida pela
          legislação.
        </p>
        <p>
          Determinadas informações relacionadas a reservas, avaliações, pagamentos, comissões,
          segurança ou obrigações legais poderão permanecer armazenadas quando houver fundamento
          legal para sua conservação.
        </p>
        <p>
          Quando possível e apropriado, informações relacionadas ao histórico de reservas e
          avaliações poderão ser <strong>anonimizadas</strong>, de forma que não permaneçam
          associadas diretamente à identidade do usuário.
        </p>
        <p>
          A exclusão de uma conta, portanto, não significa necessariamente a eliminação imediata
          de todos os registros relacionados às atividades realizadas anteriormente na plataforma.
        </p>
      </LegalSection>

      <LegalSection id="seguranca" title="10. Segurança">
        <p>
          A AprendizBay adota medidas técnicas e administrativas razoáveis e proporcionais aos
          riscos do tratamento para proteger os dados pessoais contra acessos não autorizados,
          destruição, perda, alteração, divulgação ou outras formas de tratamento inadequado ou
          ilícito.
        </p>
        <p>Entre as medidas utilizadas podem estar:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>autenticação;</li>
          <li>controles de acesso;</li>
          <li>regras de segurança de banco de dados e armazenamento;</li>
          <li>proteção das APIs;</li>
          <li>mecanismos de prevenção de fraude;</li>
          <li>registros e monitoramento de eventos de segurança;</li>
          <li>controles de acesso administrativo; e</li>
          <li>
            medidas de segurança oferecidas pelos provedores de infraestrutura utilizados pela
            plataforma.
          </li>
        </ul>
        <p>Nenhum sistema conectado à internet é completamente livre de riscos.</p>
        <p>
          Caso ocorra um incidente de segurança que possa acarretar risco ou dano relevante aos
          titulares, a AprendizBay adotará as providências exigidas pela LGPD e pela regulamentação
          da ANPD, incluindo, quando aplicável, a comunicação à ANPD e aos titulares afetados.
        </p>
      </LegalSection>

      <LegalSection id="criancas" title="11. Crianças e adolescentes">
        <p>
          A AprendizBay reconhece a necessidade de proteção especial de dados pessoais de crianças
          e adolescentes.
        </p>
        <p>
          A utilização da plataforma por menores de idade deverá ocorrer nas condições permitidas
          pela legislação brasileira e, quando necessário, com participação ou autorização do
          responsável legal.
        </p>
        <p>
          O tratamento de dados pessoais de crianças será realizado observando o melhor interesse
          da criança e as exigências específicas da LGPD e demais normas aplicáveis.
        </p>
        <p>
          Quando forem identificadas situações que exijam medidas adicionais de proteção, a
          AprendizBay poderá solicitar informações ou autorização do responsável legal ou adotar
          outras medidas apropriadas.
        </p>
      </LegalSection>

      <LegalSection id="direitos" title="12. Seus direitos">
        <p>
          Nos termos da LGPD e observadas as hipóteses e limitações legais, o titular pode
          solicitar:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>confirmação da existência de tratamento;</li>
          <li>acesso aos dados pessoais;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em
            desconformidade;
          </li>
          <li>portabilidade dos dados, quando regulamentada e aplicável;</li>
          <li>
            informação sobre entidades públicas e privadas com as quais os dados foram
            compartilhados;
          </li>
          <li>
            informação sobre a possibilidade de não fornecer consentimento e sobre as
            consequências;
          </li>
          <li>
            revogação do consentimento, quando essa for a base legal aplicável;
          </li>
          <li>
            eliminação de dados tratados com base no consentimento, observadas as exceções legais;
          </li>
          <li>oposição ao tratamento realizado nas hipóteses previstas pela LGPD; e</li>
          <li>
            revisão de decisões tomadas unicamente com base em tratamento automatizado, quando
            aplicável.
          </li>
        </ul>
        <p>
          Alguns pedidos poderão estar sujeitos a limitações previstas em lei. Por exemplo,
          determinados dados poderão precisar ser mantidos para cumprimento de obrigação legal,
          prevenção de fraude ou exercício regular de direitos.
        </p>
      </LegalSection>

      <LegalSection id="exercer-direitos" title="13. Como exercer seus direitos">
        <p>
          Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus dados
          pessoais, entre em contato:
        </p>
        <p>
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          Para proteger sua privacidade e evitar que informações pessoais sejam fornecidas a
          terceiros não autorizados, poderemos solicitar informações razoáveis para confirmar a
          identidade do solicitante quando necessário.
        </p>
        <p>
          A AprendizBay analisará cada solicitação e responderá dentro dos prazos e condições
          estabelecidos pela legislação aplicável.
        </p>
        <p>
          O titular também poderá apresentar reclamação à{" "}
          <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> quando entender que
          seus direitos relacionados à proteção de dados pessoais não foram adequadamente
          atendidos.
        </p>
      </LegalSection>

      <LegalSection id="dados-terceiros" title="14. Dados fornecidos por outros usuários">
        <p>
          Em determinadas situações, seus dados pessoais podem ser fornecidos à AprendizBay por
          outro usuário, por exemplo, quando um aluno ou professor realiza uma reserva, envia uma
          mensagem ou participa de uma atividade conjunta.
        </p>
        <p>
          Esses dados serão tratados de acordo com esta Política e com as finalidades necessárias
          à prestação dos serviços.
        </p>
        <p>
          Os usuários não devem fornecer à AprendizBay dados pessoais de terceiros quando não
          tiverem autorização ou outra base legal adequada para fazê-lo.
        </p>
      </LegalSection>

      <LegalSection id="terceiros" title="15. Links e serviços de terceiros">
        <p>A plataforma poderá conter links ou integrações com serviços de terceiros.</p>
        <p>
          Quando você acessar um serviço externo, o tratamento de dados realizado por esse terceiro
          poderá estar sujeito à sua própria política de privacidade.
        </p>
        <p>
          A AprendizBay recomenda que o usuário consulte as políticas dos serviços externos antes
          de fornecer informações pessoais diretamente a eles.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="16. Alterações desta Política">
        <p>
          Esta Política poderá ser atualizada para refletir mudanças na plataforma, nos serviços
          oferecidos, nas tecnologias utilizadas, na legislação ou nas práticas de tratamento de
          dados.
        </p>
        <p>
          A versão vigente será disponibilizada nesta página com sua respectiva data de atualização.
        </p>
        <p>
          Quando uma alteração for relevante, a AprendizBay poderá comunicar os usuários por meio
          da plataforma, por e-mail ou por outro meio apropriado.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="17. Contato">
        <p>
          Para qualquer dúvida, solicitação ou reclamação relacionada a esta Política de
          Privacidade, à proteção de dados pessoais ou à utilização da plataforma:
        </p>
        <p>
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </p>
        <p className="pt-4 text-sm text-muted-foreground">
          <strong>AprendizBay</strong>
          <br />
          Plataforma brasileira que conecta alunos e professores com aulas particulares e
          coletivas.
          <br />© 2026 AprendizBay. Todos os direitos reservados.
        </p>
        <p>
          Consulte também os{" "}
          <Link href="/termos" className="font-medium text-primary-700 hover:text-primary-600">
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
