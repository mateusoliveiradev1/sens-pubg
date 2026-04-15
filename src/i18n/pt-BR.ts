/**
 * Traduções — Português Brasileiro (padrão)
 */

const ptBR: Record<string, string> = {
    // ═══ Global ═══
    'app.name': 'PUBG Aim Analyzer',
    'app.description': 'Analise seu spray, entenda sinais de controle e teste ajustes de sensibilidade com IA',
    'app.tagline': 'Seu coach de aim pessoal',

    // ═══ Nav ═══
    'nav.home': 'Início',
    'nav.analyze': 'Analisar',
    'nav.history': 'Histórico',
    'nav.profile': 'Perfil',
    'nav.settings': 'Configurações',
    'nav.login': 'Entrar',
    'nav.logout': 'Sair',

    // ═══ Landing ═══
    'landing.hero.title': 'Entenda Seu Recoil',
    'landing.hero.subtitle': 'Analise clips reais, veja confiança e cobertura, e teste ajustes de sensibilidade com inteligência artificial',
    'landing.hero.cta': 'Começar Análise',
    'landing.features.analysis': 'Análise Frame a Frame',
    'landing.features.analysis.desc': 'Estimativa do spray usando visão computacional, cobertura e confiança do tracking',
    'landing.features.diagnostic': 'Diagnóstico Inteligente',
    'landing.features.diagnostic.desc': '6 classificações automáticas: overpull, underpull, jitter, drift e mais',
    'landing.features.sensitivity': 'Ajuste de Sensibilidade',
    'landing.features.sensitivity.desc': 'Recomendações baseadas no seu hardware real: mouse, mousepad, grip e estilo de jogo',
    'landing.features.coach': 'Coach IA Contínuo',
    'landing.features.coach.desc': 'Feedback personalizado que evolui com você ao longo do tempo',

    // ═══ Auth ═══
    'auth.login.title': 'Entrar',
    'auth.login.subtitle': 'Conecte-se para salvar seu progresso',
    'auth.login.discord': 'Continuar com Discord',
    'auth.login.google': 'Continuar com Google',
    'auth.login.steam': 'Continuar com Steam',

    // ═══ Profile ═══
    'profile.title': 'Seu Setup',
    'profile.subtitle': 'Quanto mais detalhes, melhor o contexto da análise',
    'profile.step.mouse': 'Mouse',
    'profile.step.mousepad': 'Mousepad',
    'profile.step.style': 'Estilo de Jogo',
    'profile.step.monitor': 'Monitor',
    'profile.step.pubg': 'Configurações PUBG',
    'profile.step.physical': 'Espaço Físico',
    'profile.mouse.model': 'Modelo do Mouse',
    'profile.mouse.sensor': 'Sensor',
    'profile.mouse.dpi': 'DPI',
    'profile.mouse.polling': 'Polling Rate',
    'profile.mouse.weight': 'Peso (gramas)',
    'profile.mouse.lod': 'Lift-off Distance (mm)',
    'profile.mousepad.model': 'Modelo do Mousepad',
    'profile.mousepad.width': 'Largura (cm)',
    'profile.mousepad.height': 'Altura (cm)',
    'profile.mousepad.type': 'Tipo',
    'profile.mousepad.material': 'Material',
    'profile.grip.palm': 'Palm',
    'profile.grip.claw': 'Claw',
    'profile.grip.fingertip': 'Fingertip',
    'profile.grip.hybrid': 'Híbrido',
    'profile.play.arm': 'Arm Aimer',
    'profile.play.wrist': 'Wrist Aimer',
    'profile.play.hybrid': 'Híbrido',
    'profile.save': 'Salvar Perfil',
    'profile.saved': 'Perfil salvo com sucesso!',

    // ═══ Analysis ═══
    'analyze.title': 'Analisar Clip',
    'analyze.upload.title': 'Envie seu clip de spray',
    'analyze.upload.desc': 'Arraste um clip de 5-15 segundos com spray contínuo',
    'analyze.upload.formats': 'MP4 ou WebM, até 50MB',
    'analyze.upload.drop': 'Solte o arquivo aqui',
    'analyze.upload.browse': 'Ou clique para escolher',
    'analyze.settings.weapon': 'Arma',
    'analyze.settings.scope': 'Mira',
    'analyze.settings.distance': 'Distância (metros)',
    'analyze.progress.extracting': 'Extraindo frames...',
    'analyze.progress.tracking': 'Rastreando mira...',
    'analyze.progress.calculating': 'Calculando métricas...',
    'analyze.progress.diagnosing': 'Diagnosticando...',
    'analyze.progress.done': 'Análise concluída!',
    'analyze.start': 'Iniciar Análise',

    // ═══ Metrics ═══
    'metrics.stability': 'Estabilidade do Spray',
    'metrics.vertical': 'Controle Vertical',
    'metrics.horizontal': 'Ruído Horizontal',
    'metrics.response': 'Tempo de Resposta',
    'metrics.drift': 'Desvio Direcional',
    'metrics.consistency': 'Consistência',

    // ═══ Diagnostics ═══
    'diagnosis.overpull': 'Overpull',
    'diagnosis.overpull.desc': 'Você está compensando demais para baixo',
    'diagnosis.underpull': 'Underpull',
    'diagnosis.underpull.desc': 'Compensação vertical insuficiente',
    'diagnosis.late_compensation': 'Compensação Atrasada',
    'diagnosis.late_compensation.desc': 'Demora para reagir ao recuo inicial',
    'diagnosis.excessive_jitter': 'Jitter Excessivo',
    'diagnosis.excessive_jitter.desc': 'Tremor horizontal excessivo durante o spray',
    'diagnosis.horizontal_drift': 'Desvio Horizontal',
    'diagnosis.horizontal_drift.desc': 'Tendência a puxar para {{direction}}',
    'diagnosis.inconsistency': 'Inconsistência',
    'diagnosis.inconsistency.desc': 'Variação alta entre disparos consecutivos',

    // ═══ Sensitivity ═══
    'sensitivity.title': 'Sensibilidade Recomendada',
    'sensitivity.current': 'Atual',
    'sensitivity.recommended': 'Recomendado',
    'sensitivity.change': 'Alteração',
    'sensitivity.profile.low': 'Baixa (Máx. Controle)',
    'sensitivity.profile.balanced': 'Balanceada',
    'sensitivity.profile.high': 'Alta (Máx. Velocidade)',
    'sensitivity.apply': 'Aplicar Perfil',
    'sensitivity.cm360': 'cm/360°',

    // ═══ Coach ═══
    'coach.title': 'Coach IA',
    'coach.what': 'O que está errado',
    'coach.why': 'Por que acontece',
    'coach.fix': 'O que ajustar',
    'coach.test': 'Como testar',
    'coach.adapt': 'Tempo para adaptar',
    'coach.days': '{{days}} dias',

    // ═══ History ═══
    'history.title': 'Histórico de Análises',
    'history.empty': 'Nenhuma análise ainda. Envie seu primeiro clip!',
    'history.compare': 'Comparar',
    'history.session': 'Sessão {{number}}',
    'history.improvement': 'Melhoria',
    'history.decline': 'Declínio',

    // ═══ Common ═══
    'common.loading': 'Carregando...',
    'common.error': 'Algo deu errado',
    'common.retry': 'Tentar novamente',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.next': 'Próximo',
    'common.back': 'Voltar',
    'common.close': 'Fechar',

    // ═══ Errors ═══
    'error.404.title': 'Alvo Não Encontrado',
    'error.404.desc': 'A página que você procura não existe ou foi movida',
    'error.500.title': 'Erro no Servidor',
    'error.500.desc': 'Algo deu errado no nosso lado. Tente novamente em alguns segundos',
    'error.generic': 'Ocorreu um erro inesperado',
} as const;

export default ptBR;
