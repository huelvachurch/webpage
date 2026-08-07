import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, FileText, Check } from 'lucide-react';

type LegalTab = 'privacy' | 'terms' | 'cookies';

export default function Legal() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LegalTab>('privacy');

  const currentLang = (i18n.language.substring(0, 2) as 'es' | 'en' | 'pt') || 'es';

  // Synchronize tab choice with the URL search parameters (?tab=)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') as LegalTab;
    if (tabParam === 'privacy' || tabParam === 'terms' || tabParam === 'cookies') {
      setActiveTab(tabParam);
    }
  }, [location]);

  const selectTab = (tab: LegalTab) => {
    setActiveTab(tab);
    navigate(`/legal?tab=${tab}`, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 font-gordita text-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header decoration */}
        <div className="text-center mb-12">
          <span className="text-secondary text-sm font-bold tracking-widest uppercase mb-3 block">
            {currentLang === 'en' ? 'Legal Information' : currentLang === 'pt' ? 'Informação Legal' : t('footer.sections.resources') || 'Información Legal'}
          </span>
          <h1 className="text-4xl md:text-5xl font-kenao text-primary mb-6">
            {currentLang === 'en' ? 'Legal Documents' : currentLang === 'pt' ? 'Documentos Legais' : 'Documentos Legales'}
          </h1>
          <p className="text-lg text-primary/60 max-w-2xl mx-auto">
            {currentLang === 'en' 
              ? 'Huelva Church strictly complies with the General Data Protection Regulation (GDPR) and active electronic commerce laws.'
              : currentLang === 'pt'
              ? 'A Huelva Church cumpre rigorosamente o Regulamento Geral de Proteção de Dados (GDPR) e as leis de comércio eletrónico vigentes.'
              : 'Huelva Church cumple estrictamente con el Reglamento General de Protección de Datos (RGPD) y las leyes de comercio electrónico vigentes.'
            }
          </p>
        </div>

        {/* Tab switcher pills */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
          <button
            onClick={() => selectTab('privacy')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm border ${
              activeTab === 'privacy'
                ? 'bg-primary text-white border-primary'
                : 'bg-white hover:bg-slate-100 text-primary/70 border-slate-100'
            }`}
          >
            <Shield className="w-5 h-5 shrink-0" />
            {t('footer.links.privacy')}
          </button>
          <button
            onClick={() => selectTab('terms')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm border ${
              activeTab === 'terms'
                ? 'bg-primary text-white border-primary'
                : 'bg-white hover:bg-slate-100 text-primary/70 border-slate-100'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            {t('footer.links.terms')}
          </button>
          <button
            onClick={() => selectTab('cookies')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm border ${
              activeTab === 'cookies'
                ? 'bg-primary text-white border-primary'
                : 'bg-white hover:bg-slate-100 text-primary/70 border-slate-100'
            }`}
          >
            <Lock className="w-5 h-5 shrink-0" />
            {t('footer.links.cookies')}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 md:p-12">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="prose max-w-none text-primary/80 leading-relaxed space-y-8">
              {currentLang === 'en' ? (
                // English Privacy Policy
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <Shield className="w-7 h-7 text-secondary shrink-0" />
                      Personal Data Protection according to the GDPR
                    </h2>
                    <p className="mb-4">
                      <strong>Huelva Church</strong>, in compliance with active legislation on personal data protection, informs that the personal data collected through web forms on <strong>www.huelvachurch.com</strong> is included in the specific automated user files of Huelva Church services.
                    </p>
                    <p className="mb-4">
                      The collection and automated processing of personal data aim to maintain the connection with you and to perform information, training, counseling, and other activities proper to Huelva Church.
                    </p>
                    <p>
                      This data will only be transferred to those entities that are strictly necessary with the sole purpose of complying with the aforementioned objective.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Guarantee and User Rights
                    </h3>
                    <p className="mb-4">
                      <strong>Huelva Church</strong> adopts the necessary measures to guarantee the security, integrity, and confidentiality of the data in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council, of April 27, 2016, on the protection of natural persons with regard to the processing of personal data and on the free movement of such data (GDPR).
                    </p>
                    <p className="mb-4">
                      At any time, the user can exercise the rights of access, opposition, rectification, and cancellation recognized in the aforementioned Regulation (EU). The user can exercise these rights by email to: <a href="mailto:huelvachurch@gmail.com" className="text-secondary font-bold hover:underline">huelvachurch@gmail.com</a> / <a href="mailto:admin@huelvachurch.com" className="text-secondary font-bold hover:underline">admin@huelvachurch.com</a> or at the physical address: <strong>Calle de los Marismeños, 6, 21006, Huelva</strong>.
                    </p>
                    <p>
                      The user states that all data provided by them is true and correct, and undertakes to keep it updated, reporting any changes to <a href="mailto:huelvachurch@gmail.com" className="text-secondary font-bold hover:underline">huelvachurch@gmail.com</a>.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Purpose of Personal Data Processing
                    </h3>
                    <p className="font-medium mb-3">For what purpose will we process your personal data?</p>
                    <p className="mb-4">
                      In Huelva Church, we will process your personal data collected through the www.huelvachurch.com website for the following purposes:
                    </p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>In case of signup/enrollment to our courses or volunteer activities, to maintain the connection, as well as the support, administration, information, and improvement of the service.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Sending requested information through the contact forms available on the website.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Sending newsletters, as well as special informational communications regarding church activities and events.</span>
                      </li>
                    </ul>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm">
                      <p className="mb-0">
                        We remind you that you can oppose the sending of communications by any means and at any time by sending an email to the address indicated above. The fields of these records are mandatory, and it will be impossible to carry out the stated purposes without providing this data.
                      </p>
                    </div>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Data Retention and Legitimacy
                    </h3>
                    <p className="mb-6">
                      The personal data provided will be kept as long as the connection fits or you do not request its deletion, and during the term for which legal liabilities could arise from the services provided. The processing of your data is carried out on the following legal bases:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-primary mb-2">Relationship and Agreement</h4>
                        <p className="text-sm">The request for information and/or the voluntary connection to the activities of Huelva Church, whose terms will be made available to you previously.</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-primary mb-2">Unequivocal Consent</h4>
                        <p className="text-sm">The free, specific, informed, and unequivocal consent that you grant by selecting the acceptance checkbox after reading this document.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Recipients
                    </h3>
                    <p>
                      The data will not be communicated to any third party outside Huelva Church except under legal obligation.
                    </p>
                  </div>
                </>
              ) : currentLang === 'pt' ? (
                // Portuguese Privacy Policy
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <Shield className="w-7 h-7 text-secondary shrink-0" />
                      Proteção de dados de caráter pessoal segundo o RGPD
                    </h2>
                    <p className="mb-4">
                      <strong>Huelva Church</strong>, em aplicação da legislação vigente em matéria de proteção de dados pessoais, informa que os dados recolhidos através de formulários do site <strong>www.huelvachurch.com</strong> são de facto incluídos em ficheiros de utilizadores dos serviços da Huelva Church.
                    </p>
                    <p className="mb-4">
                      A recolha e o tratamento automatizado dos dados pessoais têm como finalidade a manutenção de contato e o desempenho de tarefas de informação, formação, aconselhamento e outras atividades da Huelva Church.
                    </p>
                    <p>
                      Estes dados apenas serão cedidos às entidades necessárias com o único objetivo de dar cumprimento à finalidade anteriormente exposta.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Garantia e Direitos do Utilizador
                    </h3>
                    <p className="mb-4">
                      <strong>Huelva Church</strong> adota as medidas necessárias para garantir a segurança, integridade e confidencialidade dos dados, de acordo com o Regulamento (UE) 2016/679 do Parlamento Europeu e do Conselho, de 27 de abril de 2016, relativo à proteção das pessoas singulares no que diz respeito ao tratamento de dados pessoais (RGPD).
                    </p>
                    <p className="mb-4">
                      O utilizador poderá, a qualquer momento, exercer os direitos de acesso, oposição, retificação e cancelamento reconhecidos no citado Regulamento (UE). O exercício destes direitos pode ser realizado pelo próprio utilizador através de email para: <a href="mailto:huelvachurch@gmail.com" className="text-secondary font-bold hover:underline">huelvachurch@gmail.com</a> / <a href="mailto:admin@huelvachurch.com" className="text-secondary font-bold hover:underline">admin@huelvachurch.com</a> ou na morada física: <strong>Calle de los Marismeños, 6, 21006, Huelva</strong>.
                    </p>
                    <p>
                      O utilizador declara que todos os dados facultados por si são verdadeiros e corretos, e compromete-se a mantê-los atualizados, comunicando as alterações a <a href="mailto:huelvachurch@gmail.com" className="text-secondary font-bold hover:underline">huelvachurch@gmail.com</a>.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Finalidade do Tratamento dos Dados Pessoais
                    </h3>
                    <p className="font-medium mb-3">Com que finalidade trataremos os seus dados pessoais?</p>
                    <p className="mb-4">
                      Na Huelva Church, trataremos os seus dados pessoais recolhidos através do site www.huelvachurch.com com as seguintes finalidades:
                    </p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Em caso de inscrição ou filiação voluntária de cursos e atividades, para manter a relação, bem como o apoio, administração, informação e melhoria do serviço.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Envio de informações solicitadas através dos formulários disponíveis no site.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Envio de boletins (newsletters), bem como comunicações de atividades e eventos.</span>
                      </li>
                    </ul>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm">
                      <p className="mb-0">
                        Lembramos que pode opor-se ao envio de comunicações por qualquer meio e a qualquer momento, enviando um e-mail para a morada indicada acima. Os campos destes registos são de preenchimento obrigatório, sendo impossível realizar as finalidades expressas sem estes dados.
                      </p>
                    </div>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Conservação de Dados e Legitimidade
                    </h3>
                    <p className="mb-6">
                      Os dados pessoais fornecidos serão conservados enquanto a relação for mantida ou não solicitar a sua eliminação, e durante o prazo para o qual possam surgir responsabilidades legais pelos serviços prestados. O tratamento dos seus dados é realizado sob as seguintes bases jurídicas:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-primary mb-2">Relação e Acordo</h4>
                        <p className="text-sm">O pedido de informação e/ou vinculação de forma voluntária com as atividades da Huelva Church, cujos termos serão disponibilizados anteriormente.</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-primary mb-2">Consentimento Inequívoco</h4>
                        <p className="text-sm">O consentimento livre, específico, informado e inequívoco que outorga ao marcar positivamente a caixa de aceitação após ler o documento.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Destinatários
                    </h3>
                    <p>
                      Os dados não serão comunicados a terceiros fora da Huelva Church salvo por obrigação legal de cumprimento.
                    </p>
                  </div>
                </>
              ) : (
                // Spanish Privacy Policy (Default)
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <Shield className="w-7 h-7 text-secondary shrink-0" />
                      Protección de datos de carácter personal según la LOPD
                    </h2>
                    <p className="mb-4">
                      <strong>Huelva Church</strong>, en aplicación de la normativa vigente en materia de protección de datos de carácter personal y régimen legal de Entidades Religiosas / Sin Ánimo de Lucro en España, informa que el sitio web oficial <strong>www.huelvachurch.com</strong> pertenece a la entidad oficial Huelva Church.
                    </p>
                    <p className="mb-4">
                      La recogida y tratamiento automatizado de los datos de carácter personal tiene como finalidad el mantenimiento de la relación y el desempeño de tareas de información, formación, asesoramiento y otras actividades propias de Huelva Church.
                    </p>
                    <p>
                      Estos datos únicamente serán cedidos a aquellas entidades que sean necesarias con el único objetivo de dar cumplimiento a la finalidad anteriormente exposta.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Garantía y derechos del usuario
                    </h3>
                    <p className="mb-4">
                      <strong>Huelva Church</strong> adopta las medidas necesarias para garantizar la seguridad, integridad y confidencialidad de los datos conforme a lo dispuesto en el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos (RGPD).
                    </p>
                    <p className="mb-4">
                      El usuario podrá en cualquier momento ejercitar los derechos de acceso, oposición, rectificación y cancelación personalizados en el citado Reglamento (UE). El ejercicio de estos derechos puede realizarlo el propio usuario a través de email a: <a href="mailto:huelvachurch@gmail.com" className="text-secondary font-bold hover:underline">huelvachurch@gmail.com</a> / <a href="mailto:admin@huelvachurch.com" className="text-secondary font-bold hover:underline">admin@huelvachurch.com</a> o en la dirección física: <strong>Calle de los Marismeños, 6, 21006, Huelva</strong>.
                    </p>
                    <p>
                      El usuario manifiesta que todos los datos facilitados por él son ciertos y correctos, y se compromete a mantenerlos actualizados, comunicando los cambios a <a href="mailto:huelvachurch@gmail.com" className="text-secondary font-bold hover:underline">huelvachurch@gmail.com</a>.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Finalidad del tratamiento de los datos personales
                    </h3>
                    <p className="font-medium mb-3">¿Con qué finalidad trataremos tus datos personales?</p>
                    <p className="mb-4">
                      En Huelva Church trataremos tus datos personales recabados a través del sitio web www.huelvachurch.com con las siguientes finalidades:
                    </p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>En caso de contratación de los bienes y servicios ofertados, para mantener la relación contractual, así como la gestión, administración, información, prestación y mejora del servicio.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Envío de información solicitada a través de los formularios dispuestos en el sitio web.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <span>Remitir boletines (newsletters), así como comunicaciones informativas especiales de actividades y eventos.</span>
                      </li>
                    </ul>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm">
                      <p className="mb-0">
                        Te recordamos que puedes oponerte al envío de comunicaciones por cualquier vía y en cualquier momento, remitiendo un correo electrónico a la dirección indicada anteriormente. Los campos de dichos registros son de cumplimentación obligatoria, siendo imposible realizar las finalidades expresadas si no se aportan esos datos.
                      </p>
                    </div>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Conservación de datos y legitimación
                    </h3>
                    <p className="mb-6">
                      Los datos personales proporcionados se conservarán mientras se mantenga la relación o no solicites su supresión y durante el plazo por el cual pudieran derivarse responsabilidades legales por los servicios prestados. El tratamiento de tus datos se realiza con las siguientes bases jurídicas:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-primary mb-2 font-gordita">Relación y Convenio</h4>
                        <p className="text-sm">La solicitud de información y/o la vinculación voluntaria con las actividades de Huelva Church, cuyos términos se pondrán a tu disposición preliminarmente.</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <h4 className="font-bold text-primary mb-2 font-gordita">Consentimiento Inequívoco</h4>
                        <p className="text-sm">El consentimiento libre, específico, informado e inequívoco que otorgues al marcar positivamente la casilla de aceptación después de leer el documento.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-secondary block rounded-full"></span>
                      Destinatarios
                    </h3>
                    <p>
                      Los datos no se comunicarán a ningún tercero ajeno a Huelva Church salvo obligación legal de cumplimiento.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: TERMS OF USE */}
          {activeTab === 'terms' && (
            <div className="prose max-w-none text-primary/80 leading-relaxed space-y-8">
              {currentLang === 'en' ? (
                // English Terms of Use
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <FileText className="w-7 h-7 text-secondary shrink-0" />
                      Terms and Conditions of Use
                    </h2>
                    <p className="mb-6">
                      Access to and use of this website attribute the status of user and imply full and unreserved acceptance of each and every one of the provisions included in these Terms and Conditions. The user undertakes to make appropriate and lawful use of the website and its contents, in accordance with applicable legislation, morality, good customs, and public order.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Intellectual Property Rights</h3>
                    <p className="mb-4">
                      <strong>Huelva Church</strong> is the owner of all copyrights, intellectual, industrial property, "know how" and other rights related to the contents of the website www.huelvachurch.com and the services offered on it, as well as the programs necessary for its implementation and related info.
                    </p>
                    <p className="mb-6">
                      The reproduction, publication and/or non-strictly private use of the contents, in whole or in part, of the website <strong>www.huelvachurch.com</strong> is not permitted without the prior written consent of Huelva Church.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Commercial Communications</h3>
                    <p className="mb-4">
                      In application of the LSSI laws, Huelva Church will not send advertising or promotional communications by email or other equivalent electronic communication means that have not been previously requested or expressly authorized by the recipients.
                    </p>
                    <p>
                      In the case of users who have a prior contractual relationship, Huelva Church is indeed authorized to send communications regarding activities and services similar to those initially contracted. In any case, you can request to stop receiving communications by proving your identity.
                    </p>
                  </div>
                </>
              ) : currentLang === 'pt' ? (
                // Portuguese Terms of Use
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <FileText className="w-7 h-7 text-secondary shrink-0" />
                      Termos e Condições de Uso
                    </h2>
                    <p className="mb-6">
                      O acesso e a utilização deste website atribuem a condição de utilizador e implicam a aceitação plena e sem reservas de todas as disposições incluídas nestes Termos e Condições. O utilizador compromete-se a fazer um uso adequado e lícito do site e dos seus conteúdos, em conformidade com a legislação aplicável, a moral, os bons costumes e a ordem pública.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Direitos de Propriedade Intelectual</h3>
                    <p className="mb-4">
                      <strong>Huelva Church</strong> é titular de todos os direitos de autor, propriedade intelectual, industrial, "know-how" e outros direitos relacionados com os conteúdos do website www.huelvachurch.com e os serviços aí oferecidos, bem como programas e informações relacionadas.
                    </p>
                    <p className="mb-6">
                      Não é permitida a reprodução, publicação e/ou utilização não estritamente privada dos conteúdos, totais ou parciais, do site <strong>www.huelvachurch.com</strong> sem o consentimento prévio e por escrito da Huelva Church.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Comunicações comerciais</h3>
                    <p className="mb-4">
                      Em conformidade com as diretivas, a Huelva Church não enviará comunicações publicitárias ou comerciais por e-mail ou outro meio eletrónico equivalente sem que tenham sido previamente solicitadas ou expressamente autorizadas pelos destinatários.
                    </p>
                    <p>
                      No caso de utilizadores com quem exista uma ligação prévia pelas atividades da Huelva Church, a igreja está autorizada a enviar comunicações relevantes a fins e serviços semelhantes. Em todo o caso, poderá solicitar a exclusão de novas comunicações comprovando a sua identidade.
                    </p>
                  </div>
                </>
              ) : (
                // Spanish Terms of Use (Default)
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <FileText className="w-7 h-7 text-secondary shrink-0" />
                      Términos y Condiciones de Uso
                    </h2>
                    <p className="mb-6">
                      El acceso y el uso de este sitio web atribuyen la condición de usuario e implican la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en estos Términos y Condiciones. El usuario se compromete a hacer un uso adecuado y lícito del sitio web y de sus contenidos, de conformidad con la legislación aplicable, la moral, las buenas costumbres y el orden público.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Derechos de Propiedad Intelectual</h3>
                    <p className="mb-4">
                      <strong>Huelva Church</strong> es titular de todos los derechos de autor, propiedad intelectual, industrial, "know how" y cuantos otros derechos guardan relación con los contenidos del sitio web www.huelvachurch.com y los servicios ofertados en el mismo, así como de los programas necesarios para su implementación y la información relacionada.
                    </p>
                    <p className="mb-6">
                      No se permite la reproducción, publicación y/o uso no estrictamente privado de los contenidos, totales o parciales, del sitio web <strong>www.huelvachurch.com</strong> sin el consentimiento previo y por escrito de Huelva Church.
                    </p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Comunicaciones comerciales</h3>
                    <p className="mb-4">
                      En aplicación de la LSSI, Huelva Church no enviará comunicaciones publicitarias o promocionales por correo electrónico u otro medio de comunicación electrónica equivalente que previamente no hubieran sido solicitadas o expresamente autorizadas por los destinatarios de las mismas.
                    </p>
                    <p>
                      En el caso de usuarios con los que exista una relación contractual previa, Huelva Church sí está autorizado al envío de comunicaciones referentes a fines y servicios que sean similares a los que fueron objeto de contratación inicial. En todo caso, podrás solicitar que no se te haga llegar más información comercial acreditando tu identidad.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: COOKIES POLICY */}
          {activeTab === 'cookies' && (
            <div className="prose max-w-none text-primary/80 leading-relaxed space-y-8">
              {currentLang === 'en' ? (
                // English Cookies Policy
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <Lock className="w-7 h-7 text-secondary shrink-0" />
                      Cookie Policy
                    </h2>
                    <p className="text-lg font-medium">Huelva Church informs about the use and storage of cookies on its website: www.huelvachurch.com</p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">What are cookies?</h3>
                    <p className="mb-4">
                      Cookies are files that can be downloaded to your device through web pages. They are tools that play an essential role in providing many information society services.
                    </p>
                    <p className="mb-6">
                      Among others, they allow a website to store and retrieve info about user's browsing habits or equipment. Depending on info obtained, they can be used to recognize the user and customize the service offered.
                    </p>

                    <h3 className="text-xl font-bold text-primary mb-4">Types of cookies</h3>
                    <p className="mb-4 font-medium text-slate-700">Depending on the entity managing the domain:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>First-party cookies:</strong> those sent to the user's terminal from a device or domain managed by the editor itself.</li>
                      <li><strong>Third-party cookies:</strong> those sent to the user's terminal from a device or domain managed by a third party.</li>
                    </ul>

                    <p className="mb-4 font-medium text-slate-700">Depending on their duration or persistence:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Session cookies:</strong> designed to collect and store data while the user accesses a website.</li>
                      <li><strong>Persistent cookies:</strong> data remains stored on the user's device and can be accessed for a defined period (minutes to years).</li>
                    </ul>

                    <p className="mb-4 font-medium text-slate-700">Depending on their purpose:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Technical cookies:</strong> essential for browsing, security, and using space/choices.</li>
                      <li><strong>Personalization cookies:</strong> allow access based on browser language, region, etc.</li>
                      <li><strong>Analytics cookies:</strong> allow measuring and analyzing statistically the general behavior of visitors to add improvements.</li>
                      <li><strong>Advertising and third-party social networks:</strong> simplify interaction (Facebook, YouTube, Instagram) or optional spaces.</li>
                    </ul>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Disabling and Deleting Cookies</h3>
                    <p className="mb-4">
                      You have the option to allow, block, or delete cookies installed on your device. Disabling cookies may make some services fully or partially inoperative.
                    </p>
                    <p className="mb-6">
                      The way to disable cookies is different for each browser, but usually can be done from the <strong>Tools</strong> or <strong>Options</strong> menu. The user can choose what cookies they want to allow at any time.
                    </p>

                    <h4 className="font-bold text-primary mb-4">How to configure your common browser:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-xs md:text-sm">
                      <a href="http://windows.microsoft.com/en-us/windows-vista/Block-or-allow-cookies" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Edge / Explorer
                      </a>
                      <a href="http://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Mozilla Firefox
                      </a>
                      <a href="https://support.google.com/accounts/answer/61416?hl=en" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Google Chrome
                      </a>
                      <a href="http://support.apple.com/kb/ph19214" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Apple Safari
                      </a>
                      <a href="https://help.opera.com/en/latest/web-preferences/#cookies" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Opera browser
                      </a>
                    </div>
                  </div>
                </>
              ) : currentLang === 'pt' ? (
                // Portuguese Cookies Policy
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <Lock className="w-7 h-7 text-secondary shrink-0" />
                      Política de Cookies
                    </h2>
                    <p className="text-lg font-medium">A Huelva Church informa sobre a utilização e armazenamento de cookies na sua página de internet: www.huelvachurch.com</p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">O que são cookies?</h3>
                    <p className="mb-4">
                      Cookies são ficheiros que podem ser descarregados no seu computador através de páginas web. São ferramentas essenciais para a prestação de inúmeros serviços digitais.
                    </p>
                    <p className="mb-6">
                      Entre outras coisas, permitem que um site armazene e recupere informações sobre hábitos de navegação de um utilizador ou do seu dispositivo de forma a reconhecer o utilizador e personalizar a sua experiência.
                    </p>

                    <h3 className="text-xl font-bold text-primary mb-4">Tipos de cookies</h3>
                    <p className="mb-4 font-medium text-slate-700">Segundo a entidade proprietária ou gestora:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Cookies próprios:</strong> os enviados para o terminal do utilizador a partir de um domínio gerido pela nossa própria igreja.</li>
                      <li><strong>Cookies de terceiros:</strong> os enviados de facto por um domínio gerido por parceiros ou entidades externas.</li>
                    </ul>

                    <p className="mb-4 font-medium text-slate-700">Segundo a sua persistência de tempo:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Cookies de sessão:</strong> desenhados para guardar dados puramente enquanto o utilizador navega pelo site.</li>
                      <li><strong>Cookies persistentes:</strong> dados continuam no terminal e podem ser acedidos durante um tempo definido (minutos a anos).</li>
                    </ul>

                    <p className="mb-4 font-medium text-slate-700">Segundo a sua finalidade operacional:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Cookies técnicos:</strong> fundamentais para aceder a opções e garantir segurança geral de navegação.</li>
                      <li><strong>Cookies de personalização:</strong> permitem a seleção de idioma, filtros regionais, etc.</li>
                      <li><strong>Cookies de análise:</strong> servem para medir de forma anónima o fluxo estatístico de visitas visando melhorar o site.</li>
                      <li><strong>Cookies de redes sociais:</strong> permitem interagir e partilhar conteúdos em Redes como Facebook, YouTube, Instagram.</li>
                    </ul>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Desativação e eliminação de cookies</h3>
                    <p className="mb-4">
                      Tem a opção de permitir, bloquear ou eliminar os cookies instalados através das preferências do seu navegador. Se optar por desativar as cookies, algumas áreas ou serviços podem deixar de funcionar.
                    </p>
                    <p className="mb-6">
                      A forma de desativar cookies varia por navegador, mas geralmente encontra-se no menu de <strong>Ferramentas</strong> ou <strong>Opções</strong>. O utilizador pode escolher as suas preferências a cada momento.
                    </p>

                    <h4 className="font-bold text-primary mb-4">Como configurar o seu navegador habitual:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-xs md:text-sm">
                      <a href="http://windows.microsoft.com/pt-PT/windows-vista/Block-or-allow-cookies" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Edge / Explorer
                      </a>
                      <a href="http://support.mozilla.org/pt-PT/kb/ativar-e-desativar-cookies-que-os-sitios-web-utiliza" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Mozilla Firefox
                      </a>
                      <a href="https://support.google.com/accounts/answer/61416?hl=pt" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Google Chrome
                      </a>
                      <a href="https://support.apple.com/pt-pt/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Apple Safari
                      </a>
                      <a href="https://help.opera.com/pt/latest/web-preferences/#cookies" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Opera browser
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                // Spanish Cookies Policy (Default)
                <>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-kenao text-primary mb-6 flex items-center gap-3">
                      <Lock className="w-7 h-7 text-secondary shrink-0" />
                      Política de Cookies
                    </h2>
                    <p className="text-lg font-medium">Huelva Church informa acerca de la utilización y almacenamiento de cookies en su página web: www.huelvachurch.com</p>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">¿Qué son las cookies?</h3>
                    <p className="mb-4">
                      Las cookies son archivos que se pueden descargar en su equipo a través de las páginas web. Son herramientas que tienen un papel esencial para la prestación de numerosos servicios de la sociedad de la información.
                    </p>
                    <p className="mb-6">
                      Entre otros, permiten a una página web almacenar y recuperar información sobre los hábitos de navegación de un usuario o de su equipo y, dependiendo de la información obtenida, se pueden utilizar para reconocer al usuario y mejorar el servicio ofrecido de forma personalizada.
                    </p>

                    <h3 className="text-xl font-bold text-primary mb-4">Tipos de cookies</h3>
                    <p className="mb-4 font-medium text-slate-700">Según quien sea la entidad que gestione el dominio:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Cookies propias:</strong> aquéllas que se envían al equipo terminal del usuario desde un equipo o dominio gestionado por el propio editor y desde el que se presta el servicio solicitado por el usuario.</li>
                      <li><strong>Cookies de terceros:</strong> aquéllas que se envían al equipo terminal del usuario desde un equipo o dominio que no es gestionado por el editor, sino por otra entidad que trata los datos obtenidos a través de las cookies.</li>
                    </ul>

                    <p className="mb-4 font-medium text-slate-700">Según su duración o persistencia temporal:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Cookies de sesión:</strong> diseñadas para recabar y almacenar datos mientras el usuario accede a una página web. Se suelen emplear para almacenar información que solo interesa conservar para la prestación del servicio en una sola ocasión.</li>
                      <li><strong>Cookies persistentes:</strong> los datos siguen almacenados en el terminal y pueden ser accedidos durante un periodo definido por el responsable de la cookie, que puede ir de unos minutos a varios años.</li>
                    </ul>

                    <p className="mb-4 font-medium text-slate-700">Según su finalidad operativa:</p>
                    <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                      <li><strong>Cookies técnicas:</strong> esenciales para la navegación, seguridad y uso adecuado de las opciones del portal web.</li>
                      <li><strong>Cookies de personalización:</strong> permiten el acceso según criterios predefinidos como el idioma, región o navegador.</li>
                      <li><strong>Cookies de análisis:</strong> permiten medir y analizar estadísticamente el comportamiento general de los visitantes de la web para añadir mejoras.</li>
                      <li><strong>Cookies publicitarias y de redes de terceros:</strong> facilitan la interacción social de contenido (Facebook, Twitter/X, Instagram, YouTube) o la segmentación opcional de espacios.</li>
                    </ul>
                  </div>

                  <hr className="border-slate-100 py-2" />

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Desactivación y eliminación de cookies</h3>
                    <p className="mb-4">
                      Tienes la opción de permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones del navegador instalado en tu dispositivo. Al desactivar cookies, algunos de los servicios disponibles podrían dejar de estar totalmente operativos.
                    </p>
                    <p className="mb-6">
                      La forma de deshabilitar las cookies es diferente para cada navegador, pero normalmente puede hacerse desde el menú <strong>Herramientas</strong> u <strong>Opciones</strong>. También puede consultarse el menú de Ayuda del propio navegador. El usuario podrá en cualquier momento elegir qué cookies quiere que funcionen en este sitio web.
                    </p>

                    <h4 className="font-bold text-primary mb-4">¿Cómo configurar tu navegador habitual?</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-xs md:text-sm">
                      <a href="http://windows.microsoft.com/es-es/windows-vista/Block-or-allow-cookies" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Edge / Explorer
                      </a>
                      <a href="http://support.mozilla.org/es/kb/impedir-que-los-sitios-web-guarden-sus-preferencia" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Mozilla Firefox
                      </a>
                      <a href="https://support.google.com/accounts/answer/61416?hl=es" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Google Chrome
                      </a>
                      <a href="http://safari.helpmax.net/es/privacidad-y-seguridad/como-gestionar-las-cookies/" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Apple Safari
                      </a>
                      <a href="http://help.opera.com/Linux/10.60/es-ES/cookies.html" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-secondary transition-colors text-center block font-bold text-primary/80">
                        Opera browser
                      </a>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
