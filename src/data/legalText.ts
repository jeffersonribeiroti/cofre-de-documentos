export interface DocumentoLegalInfo {
  titulo: string;
  versao: string;
  data_vigencia: string;
  conteudo: string;
}

export const TERMOS_DE_USO_COMPLETO: DocumentoLegalInfo = {
  titulo: "Termos e Condições de Uso do Sistema Cofre de Documentos Seguro",
  versao: "1.0",
  data_vigencia: "2026-09-04",
  conteudo: `TERMOS E CONDIÇÕES DE USO DO SISTEMA COFRE DE DOCUMENTOS SEGURO
Versão: 1.0
Última Atualização: 2026-09-04
Controlador: Cofre de Documentos Corporativo S.A.
CNPJ: 00.000.000/0001-00

1. OBJETO E ESCOPO
1.1. O presente instrumento regula as condições gerais de acesso e utilização do sistema "Cofre de Documentos Seguro" (doravante denominado "SISTEMA"), disponibilizado por Cofre de Documentos Corporativo S.A..
1.2. O SISTEMA destina-se ao armazenamento, gestão, classificação de segurança da informação, visualização controlada e auditoria de documentos corporativos e técnicos.

2. ACEITAÇÃO E VINCULAÇÃO
2.1. O cadastro e o uso do SISTEMA são condicionados à aceitação prévia, expressa e irrevogável destes Termos de Uso e da Política de Privacidade.
2.2. Ao assinalar a caixa de seleção ("Li e aceito os Termos de Uso") durante o cadastro, o Usuário declara ter lido, compreendido e concordado com todas as disposições aqui estipuladas.
2.3. O aceite é registrado de forma eletrônica, contendo carimbo temporal, identificador do usuário, endereço IP e versão vigente do documento, com validade jurídica probatória.

3. NÍVEIS DE CLASSIFICAÇÃO E CONTROLE DE ACESSO
3.1. A informação contida no SISTEMA é estruturada em 4 (quatro) níveis de confidencialidade:
    a) PÚBLICO: Documentos institucionais de livre visualização interna.
    b) INTERNO: Políticas, manuais operacionais e comunicados corporativos restritos ao quadro de colaboradores.
    c) CONFIDENCIAL: Relatórios financeiros, contratos com parceiros e informações estratégicas sujeitas a segredo comercial.
    d) SIGILOSO: Planejamento de alto nível, dados de auditoria especial e informações críticas restritas a autoridade máxima de segurança.
3.2. O Usuário terá acesso estritamente aos documentos cujo nível de classificação seja compatível ou inferior ao seu nível de autorização formal concedido pelo Administrador.
3.3. Qualquer tentativa de burlar, forjar, interceptar ou elevar privilégios de acesso será detectada pelos módulos de segurança e registrada na trilha de auditoria.

4. DEVERES E RESPONSABILIDADES DO USUÁRIO
4.1. O Usuário compromete-se a:
    a) Fornecer informações cadastrais verdadeiras, completas e atualizadas (incluindo CPF e telefone válidos).
    b) Manter a confidencialidade irrestrita de suas credenciais de acesso (senha pessoal), sendo integralmente responsável por qualquer ação realizada sob sua conta.
    c) Utilizar senhas fortes, observando os critérios mínimos de complexidade exigidos pelo SISTEMA.
    d) Não compartilhar, ceder, emprestar ou divulgar sua conta a terceiros.
    e) Utilizar as informações e documentos obtidos única e exclusivamente para as finalidades autorizadas de sua função.
    f) Respeitar a propriedade intelectual e os segredos industriais contidos nos documentos.
    g) Comunicar imediatamente ao Administrador qualquer suspeita de comprometimento de suas credenciais.

5. MARCAS D'ÁGUA FORENSES E VEDAÇÃO DE REPRODUÇÃO
5.1. A visualização de documentos classificados como CONFIDENCIAL ou SIGILOSO projeta automaticamente na tela uma marca d'água forense dinâmica, contendo o nome completo do usuário, CPF formatado, endereço IP e carimbo de data/hora.
5.2. É estritamente vedada a captura de tela (print screen), fotografia, reprodução, gravação em vídeo, download não autorizado, impressão ou vazamento por qualquer meio de documentos restritos.
5.3. A marca d'água possui valor forense para identificação imediata da origem de eventual vazamento de dados corporativos ou pessoais.

6. MONITORAMENTO E AUDITORIA
6.1. O Usuário está expressamente ciente de que todas as ações realizadas no SISTEMA — incluindo, mas não se limitando a: logins bem-sucedidos ou falhos, consultas a documentos, tentativas de acesso bloqueadas por falta de permissão, cadastros e alterações de perfil — são monitoradas e registradas em trilha de auditoria imutável.
6.2. Os registros de log serão mantidos pelo prazo legal para fins de segurança da informação, conformidade regulatória e instrução de processos judiciais ou administrativos.

7. PENALIDADES E SANÇÕES
7.1. O descumprimento de qualquer cláusula deste instrumento sujeitará o Usuário infrator a:
    a) Suspensão ou cancelamento imediato do acesso ao SISTEMA.
    b) Aplicação de sanções disciplinares corporativas cabíveis.
    c) Responsabilização civil por perdas e danos materiais e morais decorrentes do vazamento de informações.
    d) Notificação às autoridades competentes para apuração de ilícitos penais e violações à Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

8. MODIFICAÇÕES DOS TERMOS
8.1. Estes Termos de Uso poderão ser alterados a qualquer momento para refletir melhorias funcionais ou adequações à legislação.
8.2. Em caso de atualizações materiais, o Usuário será notificado para confirmação e novo aceite na próxima autenticação.

9. FORO E LEGISLAÇÃO APLICÁVEL
9.1. Este contrato é regido pelas leis da República Federativa do Brasil, em especial o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD (Lei nº 13.709/2018).
9.2. Fica eleito o Foro da Comarca de Recife, Estado de Pernambuco, como competente para dirimir quaisquer controvérsias oriundas deste documento.`
};

export const POLITICA_DE_PRIVACIDADE_COMPLETA: DocumentoLegalInfo = {
  titulo: "Política de Privacidade e Proteção de Dados Pessoais (LGPD)",
  versao: "1.0",
  data_vigencia: "2026-09-04",
  conteudo: `POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS PESSOAIS
Conforme a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)
Versão: 1.0
Última Atualização: 2026-09-04

1. IDENTIFICAÇÃO DO CONTROLADOR
O Controlador dos dados pessoais tratados no âmbito do sistema "Cofre de Documentos Seguro" é:
- Razão Social: Cofre de Documentos Corporativo S.A.
- CNPJ: 00.000.000/0001-00
- Endereço: Av. Engenharia de Software, 1000 - Recife/PE
- Canal Oficial de Atendimento: suporte@cofreseguro.com.br
- E-mail de Privacidade: privacidade@cofreseguro.com.br

2. IDENTIFICAÇÃO DO ENCARREGADO PELO TRATAMENTO DE DADOS (DPO)
Em cumprimento ao art. 41 da LGPD, designamos o Encarregado pelo Tratamento de Dados Pessoais (Data Protection Officer - DPO):
- Cargo: Encarregado de Proteção de Dados (DPO Institucional)
- Contato Direto: dpo@cofreseguro.com.br
O Encarregado é o canal de comunicação entre o Controlador, os Titulares dos dados e a Autoridade Nacional de Proteção de Dados (ANPD).

3. DADOS PESSOAIS COLETADOS E FINALIDADES DO TRATAMENTO
Tratamos apenas os dados estritamente necessários para a operação segura da plataforma:
a) Dados Cadastrais:
   - Nome e Sobrenome: Para identificação unívoca do titular.
   - CPF (Cadastro de Pessoas Físicas): Para autenticação segura e garantia de que cada conta pertença a pessoa física real.
   - Telefone: Para canal de contato de emergência e recuperação de conta.
   - Senha (em formato de hash criptográfico com salt): Para controle de acesso exclusivo do titular.
b) Dados de Registro e Navegação:
   - Endereço IP (Protocolo de Internet): Para controle de segurança, prevenção a ataques cibernéticos e cumprimento do art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).
   - Data, Hora e Operação Realizada: Para auditoria de acessos e cumprimento de dever legal e regulatório de segurança.
   - Versão do Navegador/Agente de Usuário: Para suporte técnico e adequação de layout.

4. BASES LEGAIS DO TRATAMENTO (ART. 7º DA LGPD)
O tratamento de seus dados pessoais fundamenta-se nas seguintes hipóteses legais:
- Art. 7º, I (Consentimento): Manifestado no ato do cadastro para o tratamento de dados cadastrais.
- Art. 7º, II (Cumprimento de Obrigação Legal ou Regulatória): Guarda de registros de acesso a aplicações (Marco Civil da Internet) e atendimento a ordens judiciais.
- Art. 7º, IX (Legítimo Interesse): Para prevenção a fraudes, segurança da infraestrutura de tecnologia e proteção contra acessos indevidos a documentos confidenciais.
- Art. 7º, VI (Exercício Regular de Direitos): Em processos judiciais, administrativos ou arbitrais.

5. COMPARTILHAMENTO DE DADOS
5.1. Não comercializamos, não alugamos e não compartilhamos seus dados pessoais com empresas de publicidade ou marketing.
5.2. O compartilhamento poderá ocorrer estritamente com:
    a) Provedores de hospedagem em nuvem que atuam como operadores sob rigorosos contratos de sigilo e conformidade técnica.
    b) Autoridades policiais, regulatórias ou judiciais, mediante determinação legal ou mandado competente.

6. MEDIDAS DE SEGURANÇA DA INFORMAÇÃO
Adotamos medidas técnicas e organizacionais de padrão internacional para proteger os dados pessoais:
- Criptografia de senhas utilizando algoritmo PBKDF2 com HMAC-SHA256 e 600.000 iterações com salt individualizado de 32 bytes.
- Prevenção contra ataques de SQL Injection por meio de consultas parametrizadas rigorosas em 100% das operações de banco de dados.
- Mecanismo de Rate Limiting ativo para mitigar ataques de força bruta no login e denial of service (DoS) na API.
- Marca d'água forense dinâmica em visualização de dados confidenciais para coibir e rastrear vazamentos.
- Trilha de auditoria integral e inviolável com isolamento de privilégios via modelo RBAC (Role-Based Access Control).

7. RETENÇÃO E ELIMINAÇÃO DE DADOS
7.1. Os dados cadastrais serão mantidos enquanto o cadastro do Usuário permanecer ativo no SISTEMA.
7.2. Os registros de auditoria e logs de conexão são mantidos pelo prazo mínimo de 6 (seis) meses, conforme exigência do art. 15 do Marco Civil da Internet, e por até 5 (cinco) anos para fins de prescrição jurídica e auditoria corporativa.
7.3. Mediante solicitação formal de exclusão pelo Titular (quando não houver dever legal de manutenção), os dados pessoais serão anonimizados ou descartados de forma segura.

8. DIREITOS DO TITULAR DE DADOS PESSOAIS (ART. 18 DA LGPD)
Você, como Titular dos dados, pode a qualquer tempo e mediante requisição gratuita ao nosso DPO:
a) Confirmar a existência de tratamento de seus dados.
b) Acessar os dados pessoais mantidos no SISTEMA.
c) Solicitar a correção de dados incompletos, inexatos ou desatualizados.
d) Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei.
e) Solicitar a portabilidade dos dados a outro fornecedor de serviço.
f) Obter informações sobre as entidades públicas e privadas com as quais o Controlador compartilhou dados.
g) Revogar o consentimento, com informação clara sobre as consequências dessa decisão.

9. CANAL DE ATENDIMENTO E EXERCÍCIO DE DIREITOS
Para exercer qualquer de seus direitos de titular ou esclarecer dúvidas sobre esta Política, envie mensagem diretamente ao nosso Encarregado (DPO) através do e-mail:
- dpo@cofreseguro.com.br
As solicitações serão respondidas nos prazos legalmente estabelecidos pela ANPD.`
};
