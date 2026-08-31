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
          A Aprendiz Bay é uma plataforma digital brasileira que intermedia o
          encontro entre alunos e professores para aulas individuais e coletivas,
          presenciais ou online. Não prestamos a aula em nosso nome: o contrato
          de ensino se forma entre aluno e professor, com a plataforma atuando
          como marketplace, meio de agendamento, mensagens e pagamento.
        </p>
        <p>
          A Aprendiz Bay não é instituição de ensino, não emite certificado
          oficial e não estabelece vínculo empregatício com professores
          cadastrados.
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
          Depois que o professor aceita a reserva, o aluno paga pelo checkout
          Asaas, com <strong>PIX</strong> ou <strong>cartão de crédito</strong>.
          Uma taxa da plataforma (padrão de 10%, configurável) é destacada
          antes do pagamento e registrada na reserva como valor do professor e
          taxa da Aprendiz Bay.
        </p>
        <p>
          O processamento financeiro é feito pelo Asaas. A Aprendiz Bay não
          armazena o número completo do cartão. Dados de cobrança (incluindo
          CPF informado no checkout) são tratados conforme a{" "}
          <Link href="/privacidade" className="font-medium text-primary-700 hover:text-primary-600">
            Política de Privacidade
          </Link>{" "}
          e as regras do Asaas.
        </p>
      </LegalSection>

      <LegalSection id="cancelamento" title="7. Cancelamento e reembolso">
        <p>
          Reservas ainda não pagas podem ser canceladas pelo aluno ou pelo
          professor sem cobrança. Em reservas pagas:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            o aluno tem cancelamento gratuito com estorno integral se cancelar
            com <strong>24 horas ou mais</strong> de antecedência;
          </li>
          <li>
            cancelamento do aluno com menos de 24 horas não é gratuito e o
            valor pago é mantido, salvo determinação legal em contrário;
          </li>
          <li>
            se o professor cancelar uma aula já paga, o aluno recebe estorno
            integral.
          </li>
        </ul>
        <p>
          Estornos são solicitados ao Asaas. O prazo de efetivação no banco ou
          na fatura depende do meio de pagamento.
        </p>
      </LegalSection>

      <LegalSection id="avaliacoes" title="8. Avaliações e mensagens">
        <p>
          Avaliações exigem reserva concluída e devem ser honestas, sem ofensas
          ou dados de terceiros. A nota pública do professor é recalculada a
          partir dessas avaliações. Mensagens entre aluno e professor destinam-se
          apenas ao combinado da aula; spam, assédio ou conteúdo ilícito são
          proibidos.
        </p>
      </LegalSection>

      <LegalSection id="condutas" title="9. Condutas proibidas">
        <p>
          É vedado usar a plataforma para fraudar pagamentos, burlar a
          verificação de professores, publicar conteúdo discriminatório,
          ofensivo ou ilegal, coletar dados de outros usuários, atacar a
          segurança do sistema ou desviar reservas para fora da plataforma com
          o fim de evitar a taxa após o uso dos recursos de busca e agendamento.
        </p>
      </LegalSection>

      <LegalSection id="propriedade" title="10. Propriedade intelectual">
        <p>
          Marca, layout, textos institucionais e software da Aprendiz Bay
          pertencem à plataforma ou a seus licenciadores. O professor mantém
          os direitos sobre o conteúdo didático que cria, e concede à
          plataforma licença limitada para exibir o perfil, a bio e os
          materiais que ele próprio publica.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidade" title="11. Limitação de responsabilidade">
        <p>
          A qualidade pedagógica da aula, pontualidade e ambiente (online ou
          presencial) são de responsabilidade do professor e, no que couber, do
          aluno. A plataforma envida esforços razoáveis de disponibilidade e
          verificação, mas não garante resultado de aprendizado, aprovação em
          exames ou funcionamento ininterrupto de serviços de terceiros (Firebase,
          Asaas, salas de videoconferência).
        </p>
        <p>
          Nada neste rascunho afasta direitos irrenunciáveis do consumidor
          previstos no Código de Defesa do Consumidor.
        </p>
      </LegalSection>

      <LegalSection id="exclusao" title="12. Encerramento da conta">
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

      <LegalSection id="lei" title="13. Lei aplicável e foro">
        <p>
          Aplica-se a legislação brasileira, em especial o Código de Defesa do
          Consumidor, o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD
          (Lei nº 13.709/2018). Em relações de consumo, o foro é o do domicílio
          do usuário. Demais controvérsias serão submetidas ao foro competente
          no Brasil, a ser confirmado após revisão jurídica e definição da
          sede da pessoa jurídica.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="14. Contato e alterações">
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
