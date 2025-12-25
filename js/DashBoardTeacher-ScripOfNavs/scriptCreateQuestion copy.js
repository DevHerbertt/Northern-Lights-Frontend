// Configuração
const API_BASE_URL = 'http://localhost:8080';

// Elementos do DOM
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do formulário
    const createQuestionForm = document.getElementById('createQuestionForm');
    const resetFormBtn = document.getElementById('resetForm');
    const questionImage = document.getElementById('questionImage');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const optionInputs = document.querySelectorAll('.option-input');
    const successModal = document.getElementById('successModal');
    const createAnotherBtn = document.getElementById('createAnother');
    const viewQuestionsBtn = document.getElementById('viewQuestions');
    
    // Elementos de estatísticas
    const totalQuestionsElement = document.getElementById('totalQuestions');
    const myQuestionsElement = document.getElementById('myQuestions');
    
    // Carregar estatísticas
    loadStats();
    
    // Configurar upload de imagem
    uploadImageBtn.addEventListener('click', () => questionImage.click());
    
    questionImage.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validar tipo de arquivo
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                alert('Por favor, selecione uma imagem no formato JPG, PNG ou GIF.');
                return;
            }
            
            // Validar tamanho (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }
            
            // Mostrar preview
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                imagePreview.querySelector('.image-placeholder').style.display = 'none';
                removeImageBtn.style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
        }
    });
    
    removeImageBtn.addEventListener('click', function() {
        questionImage.value = '';
        previewImage.src = '';
        previewImage.style.display = 'none';
        imagePreview.querySelector('.image-placeholder').style.display = 'block';
        removeImageBtn.style.display = 'none';
    });
    
    // Limpar formulário
    resetFormBtn.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja limpar todos os campos do formulário?')) {
            createQuestionForm.reset();
            questionImage.value = '';
            previewImage.src = '';
            previewImage.style.display = 'none';
            imagePreview.querySelector('.image-placeholder').style.display = 'block';
            removeImageBtn.style.display = 'none';
        }
    });
    
    // Enviar formulário
    createQuestionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Coletar dados básicos do formulário
            const questionData = {
                title: document.getElementById('questionTitle').value.trim(),
                description: document.getElementById('questionDescription').value.trim(),
                multipleChoice: true // Como é um formulário de múltipla escolha
            };
            
            // Coletar opções
            const options = [];
            optionInputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    const option = {
                        text: value,
                        correct: document.querySelector('input[name="correctOption"]:checked').value === input.dataset.option
                    };
                    options.push(option);
                }
            });
            
            // Adicionar opções ao questionData
            if (options.length > 0) {
                questionData.options = options;
            }
            
            // Validar dados
            if (!validateQuestionData(questionData)) {
                return;
            }
            
            // Obter token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token não encontrado. Faça login novamente.');
            }
            
            // Mostrar indicador de carregamento
            const submitBtn = createQuestionForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            submitBtn.disabled = true;
            
            // Criar FormData para enviar imagem separadamente
            const formData = new FormData();
            
            // Adicionar dados da questão como JSON
            formData.append('question', JSON.stringify(questionData));
            
            // Adicionar imagem se existir
            if (questionImage.files[0]) {
                formData.append('imageFile', questionImage.files[0]);
            }
            
            // Enviar para API
            const response = await fetch(`${API_BASE_URL}/questions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Não definir Content-Type - FormData irá definir com boundary
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ${response.status}: ${errorText}`);
            }
            
            const savedQuestion = await response.json();
            
            // Mostrar modal de sucesso
            document.getElementById('successMessage').textContent = 
                `Questão "${savedQuestion.title}" criada com sucesso! ID: ${savedQuestion.id}`;
            successModal.style.display = 'flex';
            
            // Atualizar estatísticas
            await loadStats();
            
        } catch (error) {
            console.error('Erro ao criar questão:', error);
            alert(`Erro ao criar questão: ${error.message || 'Tente novamente mais tarde.'}`);
        } finally {
            // Restaurar botão
            const submitBtn = createQuestionForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Questão';
            submitBtn.disabled = false;
        }
    });
    
    // Botões do modal de sucesso
    createAnotherBtn.addEventListener('click', function() {
        successModal.style.display = 'none';
        createQuestionForm.reset();
        questionImage.value = '';
        previewImage.src = '';
        previewImage.style.display = 'none';
        imagePreview.querySelector('.image-placeholder').style.display = 'block';
        removeImageBtn.style.display = 'none';
    });
    
    viewQuestionsBtn.addEventListener('click', function() {
        window.location.href = '/page/DashBoardTeacher-Nav/TeacherManageQuestions.html';
    });
});

// Função para validar dados da questão
function validateQuestionData(data) {
    // Validar título
    if (!data.title || data.title.length < 5) {
        alert('O título deve ter pelo menos 5 caracteres.');
        return false;
    }
    
    // Validar descrição
    if (!data.description || data.description.length < 10) {
        alert('A descrição deve ter pelo menos 10 caracteres.');
        return false;
    }
    
    // Validar opções (pelo menos 2)
    if (!data.options || data.options.length < 2) {
        alert('É necessário pelo menos 2 opções de resposta.');
        return false;
    }
    
    // Verificar se há pelo menos uma opção correta
    const hasCorrectOption = data.options.some(option => option.correct);
    if (!hasCorrectOption) {
        alert('É necessário selecionar uma opção correta.');
        return false;
    }
    
    return true;
}

// Função para carregar estatísticas
async function loadStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Carregar total de questões
        const totalResponse = await fetch(`${API_BASE_URL}/questions/quantity`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (totalResponse.ok) {
            const total = await totalResponse.json();
            if (totalQuestionsElement) {
                totalQuestionsElement.textContent = total;
            }
        }
        
        // Carregar questões do usuário (filtradas)
        const myQuestionsResponse = await fetch(`${API_BASE_URL}/questions?createdBy=me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (myQuestionsResponse.ok) {
            const myQuestions = await myQuestionsResponse.json();
            if (myQuestionsElement) {
                myQuestionsElement.textContent = myQuestions.length;
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Função para formatar texto para exibição
function formatTextForDisplay(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
}