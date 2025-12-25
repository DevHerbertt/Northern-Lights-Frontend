// help-manager.js
// Gerenciador de ajuda contextual

const HELP_CONTENT = {
    'teacher-dashboard': {
        title: 'Ajuda - Dashboard do Professor',
        content: `
            <h3>Bem-vindo ao Dashboard do Professor!</h3>
            <p>Este é o painel principal onde você pode:</p>
            <ul>
                <li><strong>Visualizar Estatísticas:</strong> Veja o total de alunos, questões criadas, respostas recebidas e aulas criadas.</li>
                <li><strong>Gerenciar Aulas:</strong> Crie e gerencie suas salas de aula virtuais.</li>
                <li><strong>Criar Questões:</strong> Desenvolva questões de múltipla escolha ou texto livre para seus alunos.</li>
                <li><strong>Corrigir Respostas:</strong> Avalie e forneça feedback nas respostas dos alunos.</li>
                <li><strong>Ver Desempenho:</strong> Acompanhe o desempenho dos alunos através de gráficos e estatísticas.</li>
            </ul>
            <p><strong>Dica:</strong> Use o menu lateral para navegar entre as diferentes seções do sistema.</p>
        `
    },
    'students': {
        title: 'Ajuda - Gerenciar Alunos',
        content: `
            <h3>Gerenciar Alunos</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Ver Todos os Alunos:</strong> Visualize uma lista completa de todos os seus alunos.</li>
                <li><strong>Ver Estatísticas Semanais:</strong> Acompanhe quantas questões cada aluno respondeu por semana.</li>
                <li><strong>Ver Detalhes do Aluno:</strong> Clique em um aluno para ver todas as questões que ele respondeu ou não respondeu.</li>
                <li><strong>Excluir Aluno:</strong> Use o botão de exclusão para remover um aluno do sistema (cuidado: esta ação não pode ser desfeita).</li>
            </ul>
            <p><strong>Importante:</strong> Ao excluir um aluno, todas as suas respostas e dados serão removidos permanentemente.</p>
        `
    },
    'questions': {
        title: 'Ajuda - Gerenciar Questões',
        content: `
            <h3>Gerenciar Questões</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Criar Questões:</strong> Crie questões de múltipla escolha ou texto livre.</li>
                <li><strong>Adicionar Imagens:</strong> Inclua imagens nas questões para melhor compreensão.</li>
                <li><strong>Definir Data de Expiração:</strong> Para questões de múltipla escolha, defina quando a questão expira para correção automática.</li>
                <li><strong>Adicionar Tradução:</strong> Forneça ajuda em português para os alunos.</li>
                <li><strong>Editar/Excluir:</strong> Modifique ou remova questões existentes.</li>
            </ul>
            <p><strong>Dica:</strong> Questões de múltipla escolha são corrigidas automaticamente após a data de expiração.</p>
        `
    },
    'corrections': {
        title: 'Ajuda - Correções',
        content: `
            <h3>Corrigir Respostas dos Alunos</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Ver Respostas:</strong> Visualize todas as respostas dos alunos agrupadas por semana.</li>
                <li><strong>Corrigir Manualmente:</strong> Questões de texto livre precisam ser corrigidas manualmente.</li>
                <li><strong>Atribuir Notas:</strong> Dê notas de A+ a F para cada resposta.</li>
                <li><strong>Fornecer Feedback:</strong> Escreva comentários e sugestões para os alunos.</li>
                <li><strong>Ver Notas Finais:</strong> Na aba "Dar Notas", veja um resumo do desempenho de cada aluno.</li>
            </ul>
            <p><strong>Nota:</strong> Questões de múltipla escolha são corrigidas automaticamente. Você só precisa corrigir questões de texto livre.</p>
        `
    },
    'classrooms': {
        title: 'Ajuda - Salas de Aula',
        content: `
            <h3>Gerenciar Salas de Aula</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Criar Aulas:</strong> Crie novas salas de aula virtuais com título, descrição e links.</li>
                <li><strong>Definir Horários:</strong> Configure data e hora de início e fim da aula.</li>
                <li><strong>Enviar Links:</strong> Os links das aulas são enviados automaticamente por email para todos os alunos.</li>
                <li><strong>Adicionar Gravação:</strong> Inclua o link da gravação da aula para acesso posterior.</li>
                <li><strong>Editar/Excluir:</strong> Modifique ou remova aulas existentes.</li>
            </ul>
            <p><strong>Importante:</strong> Após a data de término, os alunos só poderão acessar a gravação, não o link ao vivo.</p>
        `
    },
    'student-dashboard': {
        title: 'Ajuda - Dashboard do Estudante',
        content: `
            <h3>Bem-vindo ao Dashboard do Estudante!</h3>
            <p>Este é o painel principal onde você pode:</p>
            <ul>
                <li><strong>Ver Estatísticas:</strong> Acompanhe quantas questões você respondeu, quantas estão corretas e quantas estão pendentes.</li>
                <li><strong>Ver Gráficos:</strong> Visualize seu desempenho através de gráficos interativos.</li>
                <li><strong>Acessar Questões:</strong> Veja todas as questões disponíveis e responda-as.</li>
                <li><strong>Ver Respostas:</strong> Revise suas respostas e as correções do professor.</li>
                <li><strong>Acessar Aulas:</strong> Entre nas salas de aula virtuais e veja as gravações.</li>
            </ul>
            <p><strong>Dica:</strong> Questões de múltipla escolha são corrigidas automaticamente após a data de expiração.</p>
        `
    },
    'student-questions': {
        title: 'Ajuda - Questões',
        content: `
            <h3>Responder Questões</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Ver Questões:</strong> Visualize todas as questões disponíveis.</li>
                <li><strong>Responder:</strong> Clique em uma questão para respondê-la.</li>
                <li><strong>Múltipla Escolha:</strong> Selecione a opção correta entre as alternativas.</li>
                <li><strong>Texto Livre:</strong> Escreva sua resposta e, se necessário, anexe uma imagem.</li>
                <li><strong>Ver Tradução:</strong> Use a ajuda em português se disponível.</li>
            </ul>
            <p><strong>Importante:</strong> Após responder, aguarde a correção do professor ou a correção automática (para múltipla escolha).</p>
        `
    },
    'student-answers': {
        title: 'Ajuda - Minhas Respostas',
        content: `
            <h3>Minhas Respostas</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Ver Todas as Respostas:</strong> Visualize todas as suas respostas agrupadas por data.</li>
                <li><strong>Ver Correções:</strong> Veja as notas e feedback do professor.</li>
                <li><strong>Ver Status:</strong> Acompanhe quais respostas estão corretas, incorretas ou pendentes.</li>
                <li><strong>Revisar:</strong> Use o feedback para melhorar seu desempenho.</li>
            </ul>
            <p><strong>Dica:</strong> Respostas corretas aparecem em verde, incorretas em vermelho e pendentes em amarelo.</p>
        `
    },
    'student-classrooms': {
        title: 'Ajuda - Salas de Aula',
        content: `
            <h3>Salas de Aula</h3>
            <p>Nesta página você pode:</p>
            <ul>
                <li><strong>Ver Aulas:</strong> Visualize todas as aulas criadas pelo professor.</li>
                <li><strong>Entrar na Aula:</strong> Clique em "Entrar na Aula Agora" para acessar o link ao vivo (disponível apenas durante o horário da aula).</li>
                <li><strong>Ver Gravação:</strong> Após o término da aula, você pode assistir à gravação.</li>
                <li><strong>Ver Detalhes:</strong> Veja título, descrição e horários de cada aula.</li>
            </ul>
            <p><strong>Importante:</strong> O link ao vivo só funciona durante o horário da aula. Após o término, apenas a gravação estará disponível.</p>
        `
    }
};

// Abrir modal de ajuda
function openHelpModal(pageKey) {
    const helpContent = HELP_CONTENT[pageKey] || {
        title: 'Ajuda',
        content: '<p>Informações de ajuda não disponíveis para esta página.</p>'
    };
    
    const modal = document.getElementById('help-modal');
    if (!modal) {
        console.error('Modal de ajuda não encontrado');
        return;
    }
    
    // Preencher conteúdo
    const titleEl = modal.querySelector('#help-modal-title');
    const contentEl = modal.querySelector('#help-modal-content');
    
    if (titleEl) {
        titleEl.textContent = helpContent.title;
    }
    if (contentEl) {
        contentEl.innerHTML = helpContent.content;
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
}

// Fechar modal de ajuda
function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Exportar funções
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;




