(function() {
'use strict';

// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
// Usar window.API diretamente
const API = window.API;
  
  // Verificar token e redirecionar se necessário (será chamado após DOM estar pronto)
  function checkAuth() {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem('user');
      let user = null;
      
      try {
        user = userStr ? JSON.parse(userStr) : null;
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse do usuário:', parseError);
        user = null;
      }
      
      if (!token || !user) {
        console.warn('⚠️ Usuário não autenticado, redirecionando...');
        window.location.href = '/page/login.html';
        return false;
      }
      
      // Atualizar nome do professor se o elemento existir
      try {
        const teacherNameEl = document.getElementById("teacher-name");
        if (teacherNameEl && user.userName) {
          teacherNameEl.innerText = user.userName;
        }
      } catch (err) {
        console.warn('⚠️ Erro ao atualizar nome do professor:', err);
      }
      
      // Usar função centralizada para atualizar nome e avatar
      try {
        if (typeof window.updateUserDisplay === 'function') {
          window.updateUserDisplay(user);
        } else {
          // Fallback se user-display-manager.js não foi carregado ainda
          updateUserDisplayFallback(user);
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar display do usuário:', error);
        // Fallback em caso de erro
        try {
          updateUserDisplayFallback(user);
        } catch (fallbackError) {
          console.error('❌ Erro no fallback também:', fallbackError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro crítico em checkAuth:', error);
      // Mesmo com erro, tentar continuar se tiver token
      const token = localStorage.getItem("token");
      if (token) {
        console.warn('⚠️ Continuando apesar do erro em checkAuth');
        return true;
      }
      return false;
    }
  }
  
  // Função auxiliar para obter iniciais
  function getInitials(name) {
    if (!name) return 'AL';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  // Fallback para atualizar display do usuário
  function updateUserDisplayFallback(user) {
    const userAvatarEl = document.getElementById("user-avatar");
    if (userAvatarEl) {
      if (user.profileImage && user.profileImage.trim() !== '') {
        const imageUrl = `${API}${user.profileImage.startsWith('/') ? user.profileImage : '/' + user.profileImage}`;
        userAvatarEl.innerHTML = `<img src="${imageUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(user.userName || 'TL')}';">`;
      } else {
        const initials = getInitials(user.userName || 'TL');
        userAvatarEl.textContent = initials;
      }
    }
    
    const userNameEl = document.getElementById("user-name");
    if (userNameEl && user.userName) {
      userNameEl.textContent = user.userName;
    }
  }

  function authHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    };
  }

  // ----- Students -----

  //GetByID
  async function getStudentById(studentId) {
    try {
        const token = localStorage.getItem("token");

        
        const response = await fetch(`${API}/students/${studentId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        
        if (!response.ok) {
            console.error("Erro ao buscar estudante:", response.status, response.statusText);
            return null; 
        }

       
        const student = await response.json();
        console.log("Estudante encontrado:", student);

        return student; 

    } catch (error) {
        console.error("Erro ao buscar estudante:", error);
        return null;
    }
}

  //QUATITY
 async function getStudentsQuantity() {
    try {
        const token = localStorage.getItem("token");
        
        if (!token) {
            console.warn("⚠️ Token não encontrado para buscar estudantes");
            return;
        }

        console.log("🔍 Buscando quantidade de estudantes...");
        const response = await fetch(`${API}/students/quantity`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erro HTTP ao buscar estudantes:", response.status, response.statusText, errorText);
            return;
        }

        const total = await response.json();
        console.log("✅ Total de estudantes recebido:", total);
        
        const totalStudentsEl = document.getElementById('total-students');
        if (totalStudentsEl) {
            totalStudentsEl.textContent = total;
            console.log("✅ Total de estudantes atualizado no DOM:", total);
        } else {
            console.warn("⚠️ Elemento #total-students não encontrado no DOM");
        }

    } catch (error) {
        console.error("❌ Erro ao buscar total de estudantes:", error);
    }
  }

  
  //ALLStudents
  async function getAllStudents() {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API}/students`, {
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
       if (!response.ok) {
            console.error("Erro HTTP:", response.status, response.statusText);
            return;
       }

      const students = await response.json();
      console.log("Lista de estudantes",students);

    } catch (error) {
       console.error("Erro ao buscar estudantes:", error);
    }

  }
  
  // Função principal para carregar todos os dados do dashboard
  async function loadDashboardData() {
    try {
      console.log("🔄 Carregando dados do dashboard...");
      console.log("🔍 DEBUG: Token existe?", !!localStorage.getItem("token"));
      console.log("🔍 DEBUG: User existe?", !!localStorage.getItem("user"));
      
      // Não verificar autenticação novamente aqui - já foi verificado antes
      // Apenas verificar se o token existe
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ Token não encontrado");
        return;
      }
      
      // Carregar quantidades (não bloqueiam)
      console.log("📊 Carregando quantidades...");
      const quantityResults = await Promise.all([
        getStudentsQuantity().catch(err => {
          console.error("❌ Erro ao carregar estudantes:", err);
          return null;
        }),
        loadTotalQuestions().catch(err => {
          console.error("❌ Erro ao carregar questões:", err);
          return null;
        }),
        getAnswerQuantity().catch(err => {
          console.error("❌ Erro ao carregar respostas:", err);
          return null;
        }),
        getMeetsQuantity().catch(err => {
          console.error("❌ Erro ao carregar aulas:", err);
          return null;
        })
      ]);
      console.log("✅ Quantidades carregadas:", quantityResults);
      
      // Carregar listas (não bloqueiam)
      console.log("📋 Carregando listas...");
      try {
        getAllStudents();
        getAllQuestions();
        getAllTeacher();
        getAllMeets();
        console.log("✅ Listas iniciadas");
      } catch (err) {
        console.error("❌ Erro ao iniciar listas:", err);
      }
      
      // Carregar aulas recentes no dashboard
      console.log("📚 Carregando aulas recentes...");
      try {
        loadRecentClassrooms();
        console.log("✅ Aulas recentes carregadas");
      } catch (err) {
        console.error("❌ Erro ao carregar aulas recentes:", err);
      }
      
      // Carregar gráfico (aguarda)
      console.log("📈 Carregando gráfico...");
      try {
        await loadStudentsPerformanceChart();
        console.log("✅ Gráfico carregado");
      } catch (err) {
        console.error("❌ Erro ao carregar gráfico:", err);
      }
      
      console.log("✅ Dados do dashboard carregados com sucesso");
    } catch (error) {
      console.error("❌ Erro ao carregar dados do dashboard:", error);
      console.error("❌ Stack trace:", error.stack);
    }
  }
  
  // Consolidar todos os listeners em um único DOMContentLoaded
  // Usar IIFE para garantir que o código seja executado
  (function() {
    if (document.readyState === 'loading') {
      document.addEventListener("DOMContentLoaded", initDashboard);
    } else {
      // DOM já está pronto, executar imediatamente
      initDashboard();
    }
    
    async function initDashboard() {
      try {
        console.log("🔍 DEBUG: Inicializando dashboard...");
        console.log("🔍 DEBUG: Verificando autenticação...");
        
        // Verificar autenticação primeiro
        const isAuthenticated = checkAuth();
        console.log("🔍 DEBUG: Resultado da autenticação:", isAuthenticated);
        
        if (!isAuthenticated) {
          console.warn("⚠️ Usuário não autenticado, redirecionando...");
          return; // Se não autenticado, já redirecionou
        }
        
        console.log("🔍 DEBUG: Configurando event listeners...");
        try {
          setupEventListeners();
        } catch (err) {
          console.error("❌ Erro ao configurar event listeners:", err);
        }
        
        console.log("🔍 DEBUG: Carregando dados do dashboard...");
        await loadDashboardData();
        console.log("🔍 DEBUG: Dashboard carregado com sucesso");
      } catch (error) {
        console.error("❌ Erro crítico no initDashboard:", error);
        console.error("❌ Stack trace:", error.stack);
        // Tentar carregar dados mesmo com erro
        try {
          console.log("🔄 Tentando carregar dados após erro...");
          await loadDashboardData();
        } catch (loadError) {
          console.error("❌ Erro ao tentar carregar dados após erro:", loadError);
        }
      }
    }
  })();
  
  // Configurar event listeners
  function setupEventListeners() {
    // Botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const mobileRefreshBtn = document.getElementById('mobile-refresh-btn');
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        console.log('🚪 Logout clicado');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/page/login.html';
      });
    } else {
      console.warn('⚠️ Botão logout-btn não encontrado');
    }
    
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener('click', () => {
        console.log('🚪 Mobile logout clicado');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/page/login.html';
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        console.log('🔄 Refresh clicado');
        await loadDashboardData();
      });
    }
    
    if (mobileRefreshBtn) {
      mobileRefreshBtn.addEventListener('click', async () => {
        console.log('🔄 Mobile refresh clicado');
        await loadDashboardData();
      });
    }
  }


  //DELETEStudents
  async function deleteStudents(StudentsId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/students/${StudentsId}`,{
       
        method: "DELETE",
        headers:{
          "Authorization" : `Bearer ${token}`,
          "Content-Type" : `application/json`
        }
      });
      

      if (!response.ok) {
        console.log("Erro ao deletar estudante",response.status,response.statusText);

        return;
      }

      const mensagem = await response.text();
      console.log("Estudante deletado com sucesso:",mensagem);

      getAllStudents();
      getStudentsQuantity();


    } catch (error) {
       console.error("Erro ao deletar estudante:", error);
    }
  }


  // ----- QUESTIONS -----

  //ALLquestions
   async function getAllQuestions() {
    try {
        const token = localStorage.getItem("token"); 

        const response = await fetch(`${API}/questions`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.log("Erro HTTP", response.status, response.statusText);
            return;
        }

        const data = await response.json(); // lê o JSON retornado
        console.log("Lista de questoes", data);

    
    } catch (error) {
        console.log("Erro ao buscar Lista de Questoes:", error);
    }
}

  //quantity
 async function loadTotalQuestions() {
    try {
        const token = localStorage.getItem("token"); // pega o token do localStorage

        const response = await fetch(`${API}/questions/quantity`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.log("Erro HTTP", response.status, response.statusText);
            return;
        }

        const data = await response.json(); // lê o JSON retornado
        console.log("🔍 DEBUG: Resposta do backend (questões):", data);

        // Ajuste: se retornar { quantity: 42 } ou apenas 42
        const totalQuestions = typeof data === 'number' ? data : (data.quantity || data);

        // Atualiza o HTML
        const totalQuestionsEl = document.getElementById('total-questions');
        if (totalQuestionsEl) {
            totalQuestionsEl.textContent = totalQuestions;
            console.log("✅ Total de questões atualizado:", totalQuestions);
        } else {
            console.warn("⚠️ Elemento #total-questions não encontrado no DOM");
        }

    } catch (error) {
        console.log("Erro ao buscar quantidade de questões:", error);
    }
}

  async function getQuestionById(questionId) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API}/questions/${questionId}`,{
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
    });
        if (!response.ok) {
          console.log("Erro http",response.status,response.statusText);
          return;
        }
        const question = await response.json();
        console.log("Question id ".question);


    } catch (error) {
      console.log("nao foi possivel achar a question",error)
    }
  }


  //CRIACAO DE QUESTION

 async function createQuestion() {
    const titleInput = document.getElementById("question-title");
    const descriptionInput = document.getElementById("question-description");
    const imageInput = document.getElementById("question-image");

    const title = titleInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const imageFile = imageInput?.files[0];

    if (!title || !description) {
        showError("Título e descrição são obrigatórios!");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);

    if (imageFile) {
        formData.append("imageFile", imageFile);
    }

    // Obter token do usuário logado
    const token = localStorage.getItem("token");
    if (!token) {
        showError("Usuário não autenticado. Faça login novamente.");
        return;
    }

    setLoading(true, "Criando questão...");

    try {
        const response = await fetch(`${API}/questions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}` // NÃO colocar Content-Type com FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        const question = await response.json();
        console.log("Questão criada com sucesso:", question);
        showSuccess("Questão criada com sucesso!");

        // Limpar inputs
        titleInput.value = "";
        descriptionInput.value = "";
        imageInput.value = "";

        // Atualizar total de questões e lista, se tiver
        loadTotalQuestions();
        getAllQuestions(); // função que busca todas as questões para atualizar a tabela/lista

    } catch (error) {
        console.error("Erro ao criar questão:", error);
        showError("Erro ao criar questão: " + error.message);
    } finally {
        setLoading(false);
    }
}

// Funções auxiliares do padrão que você já está usando:

function showSuccess(message) {
    const container = document.querySelector('.question-container') || document.body;
    const div = document.createElement('div');
    div.className = "alert alert-success fade-in";
    div.textContent = message;
    container.prepend(div);
    setTimeout(() => div.remove(), 5000);
}

function showError(message) {
    const container = document.querySelector('.question-container') || document.body;
    const div = document.createElement('div');
    div.className = "alert alert-error fade-in";
    div.textContent = message;
    container.prepend(div);
    setTimeout(() => div.remove(), 5000);
}

function setLoading(loading, text = "Carregando...") {
    const overlay = document.getElementById("loading-overlay");
    const buttonText = document.getElementById("create-question-btn-text");

    if (overlay) overlay.style.display = loading ? "flex" : "none";
    if (buttonText) buttonText.textContent = loading ? text : "Criar Questão";
}

async function updateQuestion(questionId) {
    const titleInput = document.getElementById("question-title");
    const descriptionInput = document.getElementById("question-description");
    const imageInput = document.getElementById("question-image");

    const title = titleInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const imageFile = imageInput?.files[0];

    if (!title || !description) {
        showError("Título e descrição são obrigatórios!");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);

    if (imageFile) {
        formData.append("imageFile", imageFile);
    }

    const token = localStorage.getItem("token");
    if (!token) {
        showError("Usuário não autenticado. Faça login novamente.");
        return;
    }

    setLoading(true, "Atualizando questão...");

    try {
        const response = await fetch(`${API}/questions/${questionId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}` // NÃO colocar Content-Type com FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        const updatedQuestion = await response.json();
        console.log("Questão atualizada com sucesso:", updatedQuestion);
        showSuccess("Questão atualizada com sucesso!");

        // Limpar inputs
        titleInput.value = "";
        descriptionInput.value = "";
        imageInput.value = "";

        // Atualizar total de questões e lista
        loadTotalQuestions();
        getAllQuestions(); // função que atualiza a lista de questões no dashboard

    } catch (error) {
        console.error("Erro ao atualizar questão:", error);
        showError("Erro ao atualizar questão: " + error.message);
    } finally {
        setLoading(false);
    }
}



  async function deleteQuestion(questionid) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/questions/${questionid}`,{
       
        method: "DELETE",
        headers:{
          "Authorization" : `Bearer ${token}`,
          "Content-Type" : `application/json`
        }
      });
      if (!response.ok) {
        console.log("error http",response.status,response.statusText);
        return;
      }
      const mensagem = await response.text();
      console.log("question deletada com sucesso:",mensagem);

      loadTotalQuestions();

    } catch (error) {
      console.log("nao foi possivel deletar",error)
    }
    await fetch(`${API}/questions/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    loadQuestions();
  }

  // ----- ANSWERS -----


  //Create
 async function createAnswer(questionId, studentId) {
    const text = document.getElementById("answer-text").value;
    const imageFile = document.getElementById("answer-image").files[0];

    if (!text) {
        showError("O texto da resposta é obrigatório!");
        return;
    }

    const formData = new FormData();
    formData.append("text", text);
    formData.append("questionId", questionId);
    formData.append("studentId", studentId);

    if (imageFile) {
        formData.append("imageFile", imageFile);
    }

    const token = localStorage.getItem("token");
    setLoading(true, "Enviando resposta...");

    try {
        const res = await fetch(`${API}/answers`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        const newAnswer = await res.json();
        console.log("Resposta criada:", newAnswer);
        showSuccess("Resposta criada com sucesso!");

        // Limpar inputs
        document.getElementById("answer-text").value = "";
        document.getElementById("answer-image").value = "";

        // Atualizar lista de respostas
        getAnswersByQuestion(questionId);

    } catch (error) {
        console.error("Erro ao criar resposta:", error);
        showError("Erro ao criar resposta: " + error.message);
    } finally {
        setLoading(false);
    }
}

//atualizar 

async function updateAnswer(answerId, questionId) {
    const text = document.getElementById("answer-text").value;
    const imageFile = document.getElementById("answer-image").files[0];

    if (!text) {
        showError("O texto da resposta é obrigatório!");
        return;
    }

    const formData = new FormData();
    formData.append("text", text);
    formData.append("answerId", answerId);

    if (imageFile) {
        formData.append("imageFile", imageFile);
    }

    const token = localStorage.getItem("token");
    setLoading(true, "Atualizando resposta...");

    try {
        const res = await fetch(`${API}/answers`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        const updatedAnswer = await res.json();
        console.log("Resposta atualizada:", updatedAnswer);
        showSuccess("Resposta atualizada com sucesso!");

        // Atualizar lista de respostas
        getAnswersByQuestion(questionId);

    } catch (error) {
        console.error("Erro ao atualizar resposta:", error);
        showError("Erro ao atualizar resposta: " + error.message);
    } finally {
        setLoading(false);
    }
}


//Deletar

async function deleteAnswer(answerId, questionId) {
    const token = localStorage.getItem("token");
    setLoading(true, "Deletando resposta...");

    try {
        const res = await fetch(`${API}/answers/${answerId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        console.log("Resposta deletada com sucesso");
        showSuccess("Resposta deletada com sucesso!");

        // Atualizar lista de respostas
        getAnswersByQuestion(questionId);

    } catch (error) {
        console.error("Erro ao deletar resposta:", error);
        showError("Erro ao deletar resposta: " + error.message);
    } finally {
        setLoading(false);
    }
}


//GETT

async function getAnswersByQuestion(questionId) {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API}/answers/question/${questionId}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            console.error("Erro HTTP:", res.status, res.statusText);
            return;
        }

        const answers = await res.json();
        console.log("Lista de respostas:", answers);

        // Atualizar o HTML da lista de respostas
        const container = document.getElementById("answers-list");
        container.innerHTML = "";
        answers.forEach(ans => {
            const div = document.createElement("div");
            div.className = "answer-card";
            div.innerHTML = `
                <p>${ans.text}</p>
                ${ans.imagePath ? `<img src="${ans.imagePath}" alt="Resposta">` : ""}
                <button onclick="updateAnswer(${ans.id}, ${questionId})">Editar</button>
                <button onclick="deleteAnswer(${ans.id}, ${questionId})">Deletar</button>
            `;
            container.appendChild(div);
        });

    } catch (error) {
        console.error("Erro ao buscar respostas:", error);
    }
}

//Quatity
async function getAnswerQuantity() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API}/answers/quantity`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro HTTP:", response.status, response.statusText);
            return;
        }

        const total = await response.json();
        console.log("🔍 DEBUG: Número de Respostas:", total);
        
        const totalAnswersEl = document.getElementById('total-answers');
        if (totalAnswersEl) {
            totalAnswersEl.textContent = total;
            console.log("✅ Total de respostas atualizado:", total);
        } else {
            console.warn("⚠️ Elemento #total-answers não encontrado no DOM");
        }

    } catch (error) {
        console.error("Erro ao buscar total respostas:", error);
    }
  }

  
  
  // Quantity de Meets
  async function getMeetsQuantity() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API}/meets/quantity`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro HTTP:", response.status, response.statusText);
            return;
        }

        const total = await response.json();
        console.log("🔍 DEBUG: Número de Aulas:", total);
        
        const totalClassroomsEl = document.getElementById('total-classrooms');
        if (totalClassroomsEl) {
            totalClassroomsEl.textContent = total;
            console.log("✅ Total de aulas atualizado:", total);
        } else {
            console.warn("⚠️ Elemento #total-classrooms não encontrado no DOM");
        }

    } catch (error) {
        console.error("Erro ao buscar total de aulas:", error);
    }
  }




  // ----- MEETINGS -----

async function getAllMeets() {
    const token = localStorage.getItem("token");
    console.log("Token:", token); // <--- debug: veja se tem token

    try {
        const response = await fetch(`${API}/meets`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        console.log("Response status:", response.status); // <--- debug

        if (!response.ok) {
            console.error("Erro HTTP ao buscar meets:", response.status, response.statusText);
            return;
        }

        const meets = await response.json();
        console.log("Lista de meets:", meets); // <--- debug

        // Usar renderMeets do window se disponível, senão usar loadRecentClassrooms
        if (typeof window.renderMeets === 'function') {
            window.renderMeets(meets);
        } else {
            // Fallback: usar a função loadRecentClassrooms que já existe
            console.log("renderMeets não disponível, usando loadRecentClassrooms");
        }

    } catch (error) {
        console.error("Erro ao buscar meets:", error);
    }
}





 async function createMeet() {
    const title = document.getElementById("meet-title").value;
    const description = document.getElementById("meet-description").value;
    const startDate = document.getElementById("meet-start").value;
    const endDate = document.getElementById("meet-end").value;

    if (!title || !startDate || !endDate) {
        showError("Título, data de início e fim são obrigatórios!");
        return;
    }

    const dto = { title, description, startDate, endDate };
    const token = localStorage.getItem("token");
    setLoading(true, "Criando meet...");

    try {
        const res = await fetch(`${API}/meets`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dto)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        const newMeet = await res.json();
        console.log("Meet criada:", newMeet);
        showSuccess("Meet criada com sucesso!");
        getAllMeets(); // Atualiza a lista de meets

        // Limpar inputs
        document.getElementById("meet-title").value = "";
        document.getElementById("meet-description").value = "";
        document.getElementById("meet-start").value = "";
        document.getElementById("meet-end").value = "";

    } catch (error) {
        console.error("Erro ao criar meet:", error);
        showError("Erro ao criar meet: " + error.message);
    } finally {
        setLoading(false);
    }
}


async function updateMeet(meetId) {
    const title = document.getElementById("meet-title").value;
    const description = document.getElementById("meet-description").value;
    const startDate = document.getElementById("meet-start").value;
    const endDate = document.getElementById("meet-end").value;
    const linkRecordClass = document.getElementById("meet-record-link").value; // novo campo

    const dto = { title, description, startDate, endDate, linkRecordClass };
    const token = localStorage.getItem("token");
    setLoading(true, "Atualizando meet...");

    try {
        const res = await fetch(`${API}/meets/${meetId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dto)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        const updatedMeet = await res.json();
        console.log("Meet atualizada:", updatedMeet);
        showSuccess("Meet atualizada com sucesso!");
        getAllMeets(); // atualizar a lista

    } catch (error) {
        console.error("Erro ao atualizar meet:", error);
        showError("Erro ao atualizar meet: " + error.message);
    } finally {
        setLoading(false);
    }
}



//BUTAO DE PRESENTES

async function updatePresentCount(meetId, newCount) {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API}/meets/${meetId}/presentCount?newCount=${newCount}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        const updatedMeet = await res.json();
        console.log("Present count atualizado:", updatedMeet);
        showSuccess("Present count atualizado com sucesso!");
        getAllMeets();

    } catch (error) {
        console.error("Erro ao atualizar present count:", error);
        showError("Erro ao atualizar present count: " + error.message);
    }
}



async function deleteMeet(meetId) {
    const token = localStorage.getItem("token");
    setLoading(true, "Deletando meet...");

    try {
        const res = await fetch(`${API}/meets/${meetId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Erro HTTP: ${res.status}`);
        }

        console.log("Meet deletada com sucesso");
        showSuccess("Meet deletada com sucesso!");
        getAllMeets();

    } catch (error) {
        console.error("Erro ao deletar meet:", error);
        showError("Erro ao deletar meet: " + error.message);
    } finally {
        setLoading(false);
    }
}



  //Quatity
  async function getMeetingQuantity() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API}/meets/quantity`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro HTTP:", response.status, response.statusText);
            return;
        }

        const total = await response.json();
        console.log("Numero de meets",total);
       document.getElementById('total-classrooms').textContent = total;

    } catch (error) {
        console.error("Erro ao buscar total de meets:", error);
    }
  }



  // ----- TEACHER -----


  //Create
  async function createTeacher() {
    const userName = document.getElementById("teacher-name-new").value;
    const email = document.getElementById("teacher-email-new").value;
    const password = document.getElementById("teacher-pass-new").value;

    const res = await fetch(`${API}/auth/register-teacher`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userName, email, password })
    });

    alert(res.ok ? "Teacher criado!" : "Erro ao criar teacher.");
  }


  //Update


  //DELETETeacher
  async function deleteTeacherr(teacherId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/teachers/${teacherId}`,{
       
        method: "DELETE",
        headers:{
          "Authorization" : `Bearer ${token}`,
          "Content-Type" : `application/json`
        }
      });
      

      if (!response.ok) {
        console.log("Erro ao deletar professor",response.status,response.statusText);

        return;
      }

      const mensagem = await response.text();
      console.log("Professor deletado com sucesso:",mensagem);

      getAllTeacher();
      getTeacherQuantity();


    } catch (error) {
       console.error("Erro ao deletar Teacher:", error);
    }
  }


  //ALLTeacher
  async function getAllTeacher() {
  try {
    const token = localStorage.getItem("token");
    
    const response = await fetch(`${API}/teachers`, {
      headers:{
        "Authorization":`Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
      if (!response.ok) {
          console.error("Erro HTTP:", response.status, response.statusText);
          return;
      }

    const teachers = await response.json();
    console.log("Lista de Professores",teachers);

  } catch (error) {
      console.error("Erro ao buscar professores:", error);
  }

}


//Quatity
async function getTeacherQuantity() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API}/teachers/quantity`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro HTTP:", response.status, response.statusText);
            return;
        }

        const total = await response.json();
        console.log("Numero de Professores",total);
      //  document.getElementById('total-students').textContent = total;

    } catch (error) {
        console.error("Erro ao buscar total de Professores:", error);
    }
  }



  //GetById

  async function getTeacherById(teacherId) {
    try {
        const token = localStorage.getItem("token");

        
        const response = await fetch(`${API}/teachers/${teacherId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        
        if (!response.ok) {
            console.error("Erro ao buscar professor:", response.status, response.statusText);
            return null; 
        }

       
        const student = await response.json();
        console.log("Professor encontrado:", student);

        return student; 

    } catch (error) {
        console.error("Erro ao buscar professor:", error);
        return null;
    }
  }

  // Gráfico Simplificado de Desempenho da Semana
  let studentsPerformanceChart = null;

  async function loadStudentsPerformanceChart() {
    try {
      const token = localStorage.getItem("token");
      
      // Calcular data de 7 dias atrás
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Buscar todas as questões
      const questionsResponse = await fetch(`${API}/questions`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!questionsResponse.ok) {
        console.error("Erro ao buscar questões");
        return;
      }

      const allQuestions = await questionsResponse.json();
      
      // Filtrar questões da semana (criadas nos últimos 7 dias)
      const weekQuestions = allQuestions.filter(q => {
        if (!q.createdAt) return false;
        const questionDate = new Date(q.createdAt);
        return questionDate >= sevenDaysAgo;
      });

      // Buscar todos os estudantes
      const studentsResponse = await fetch(`${API}/students`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!studentsResponse.ok) {
        console.error("Erro ao buscar estudantes");
        return;
      }

      const students = await studentsResponse.json();

      // Buscar todas as respostas
      const answersResponse = await fetch(`${API}/answers`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!answersResponse.ok) {
        console.error("Erro ao buscar respostas");
        return;
      }

      const allAnswers = await answersResponse.json();
      
      // Filtrar respostas da semana
      const weekAnswers = allAnswers.filter(a => {
        if (!a.createdAt) return false;
        const answerDate = new Date(a.createdAt);
        return answerDate >= sevenDaysAgo;
      });

      // Calcular estatísticas
      const totalWeekQuestions = weekQuestions.length;
      const totalWeekAnswers = weekAnswers.length;
      
      // Contar quantos alunos responderam todas as questões da semana
      let studentsAnsweredAll = 0;
      let studentsAnsweredNothing = 0;
      
      students.forEach(student => {
        const studentAnswers = weekAnswers.filter(a => {
          if (!a.student) return false;
          const answerStudentId = a.student.id || a.student;
          return answerStudentId === student.id;
        });
        
        const answeredQuestionIds = new Set(
          studentAnswers.map(a => a.question?.id).filter(Boolean)
        );
        
        if (answeredQuestionIds.size === totalWeekQuestions && totalWeekQuestions > 0) {
          studentsAnsweredAll++;
        } else if (answeredQuestionIds.size === 0) {
          studentsAnsweredNothing++;
        }
      });

      // Criar gráfico simplificado
      createSimplifiedPerformanceChart(totalWeekQuestions, totalWeekAnswers, studentsAnsweredAll, studentsAnsweredNothing);

    } catch (error) {
      console.error("Erro ao carregar gráfico de desempenho:", error);
    }
  }

  function createSimplifiedPerformanceChart(totalQuestions, totalAnswers, studentsAnsweredAll, studentsAnsweredNothing) {
    const ctx = document.getElementById('students-performance-chart');
    if (!ctx) {
      console.warn('⚠️ Canvas do gráfico não encontrado');
      return;
    }

    if (studentsPerformanceChart) {
      studentsPerformanceChart.destroy();
    }

    // Criar gráfico de barras simples
    studentsPerformanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Questões Criadas\n(Esta Semana)',
          'Respostas Enviadas\n(Esta Semana)',
          'Alunos que\nResponderam Todas',
          'Alunos que\nNão Fizeram Nada'
        ],
        datasets: [{
          label: 'Estatísticas da Semana',
          data: [totalQuestions, totalAnswers, studentsAnsweredAll, studentsAnsweredNothing],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',   // Azul para questões
            'rgba(16, 185, 129, 0.8)',   // Verde para respostas
            'rgba(251, 191, 36, 0.8)',   // Amarelo para responderam todas
            'rgba(239, 68, 68, 0.8)'     // Vermelho para não fizeram nada
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(251, 191, 36)',
            'rgb(239, 68, 68)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' ' + (context.parsed.y === 1 ? 'item' : 'itens');
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8',
              stepSize: 1
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
  }

  // Funções de fullscreen para gráfico do professor
  function toggleFullscreenTeacher(chartId) {
    const modal = document.getElementById('fullscreen-modal-teacher');
    const title = document.getElementById('fullscreen-title-teacher');
    const canvas = document.getElementById('fullscreen-chart-teacher');
    
    if (!modal || !canvas) return;
    
    modal.style.display = 'block';
    title.textContent = 'Desempenho dos Alunos';
    
    createFullscreenChartTeacher(canvas, studentsPerformanceChart);
  }

  function createFullscreenChartTeacher(canvas, originalChart) {
    if (window.fullscreenChartTeacher) {
      window.fullscreenChartTeacher.destroy();
    }
    
    const config = JSON.parse(JSON.stringify(originalChart.config));
    config.options.maintainAspectRatio = false;
    config.options.responsive = true;
    
    // Aumentar tamanhos para fullscreen
    if (config.options.plugins) {
      if (config.options.plugins.legend) {
        config.options.plugins.legend.labels.font.size = 16;
        config.options.plugins.legend.padding = 25;
      }
      if (config.options.plugins.tooltip) {
        config.options.plugins.tooltip.padding = 15;
        config.options.plugins.tooltip.titleFont = { size: 16 };
        config.options.plugins.tooltip.bodyFont = { size: 14 };
      }
    }
    
    if (config.options.scales) {
      Object.keys(config.options.scales).forEach(key => {
        if (config.options.scales[key].ticks) {
          config.options.scales[key].ticks.font = { size: 14 };
        }
      });
    }
    
    window.fullscreenChartTeacher = new Chart(canvas, config);
  }

  function closeFullscreenTeacher() {
    const modal = document.getElementById('fullscreen-modal-teacher');
    if (modal) {
      modal.style.display = 'none';
    }
    if (window.fullscreenChartTeacher) {
      window.fullscreenChartTeacher.destroy();
      window.fullscreenChartTeacher = null;
    }
  }

  // Tornar função global
  window.toggleFullscreenTeacher = toggleFullscreenTeacher;
  window.closeFullscreenTeacher = closeFullscreenTeacher;
  
  // Carregar aulas recentes no dashboard
  async function loadRecentClassrooms() {
    try {
      const token = localStorage.getItem("token");
      const recentClassroomsDiv = document.getElementById('recent-classrooms');
      
      if (!recentClassroomsDiv) {
        console.warn('⚠️ Elemento #recent-classrooms não encontrado');
        return;
      }
      
      const response = await fetch(`${API}/meets`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        console.error("Erro ao buscar aulas:", response.status, response.statusText);
        recentClassroomsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #94a3b8;">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao carregar aulas</p>
          </div>
        `;
        return;
      }
      
      const meets = await response.json();
      
      if (!meets || meets.length === 0) {
        recentClassroomsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #94a3b8;">
            <i class="fas fa-inbox"></i>
            <p>Nenhuma aula criada ainda</p>
          </div>
        `;
        return;
      }
      
      // Ordenar por data (mais recentes primeiro) e pegar as 5 mais recentes
      const sortedMeets = meets
        .sort((a, b) => {
          const dateA = new Date(a.dateTimeStart || a.startDate || 0);
          const dateB = new Date(b.dateTimeStart || b.startDate || 0);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      recentClassroomsDiv.innerHTML = sortedMeets.map(meet => {
        const startDate = new Date(meet.dateTimeStart || meet.startDate);
        const endDate = new Date(meet.dateTimeEnd || meet.endDate);
        const now = new Date();
        
        const isPast = endDate < now;
        const isUpcoming = startDate > now;
        const isOngoing = startDate <= now && endDate >= now;
        
        let statusBadge = '';
        if (isOngoing) {
          statusBadge = '<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">● Ao Vivo</span>';
        } else if (isUpcoming) {
          statusBadge = '<span style="color: #fbbf24; font-size: 0.85rem; font-weight: 600;">Agendada</span>';
        } else {
          statusBadge = '<span style="color: #94a3b8; font-size: 0.85rem;">Finalizada</span>';
        }
        
        const formatDateTime = (date) => {
          return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        };
        
        return `
          <div style="background: rgba(15, 23, 42, 0.8); border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
              <div style="flex: 1;">
                <h3 style="color: #3b82f6; margin: 0 0 5px 0; font-size: 1.1rem;">${escapeHtml(meet.title || 'Sem título')}</h3>
                ${meet.description ? `<p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">${escapeHtml(meet.description)}</p>` : ''}
              </div>
              ${statusBadge}
            </div>
            <div style="display: flex; gap: 20px; margin-top: 15px; font-size: 0.85rem; color: #94a3b8;">
              <div><i class="fas fa-calendar-alt"></i> Início: ${formatDateTime(startDate)}</div>
              <div><i class="fas fa-calendar-check"></i> Fim: ${formatDateTime(endDate)}</div>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error("Erro ao carregar aulas recentes:", error);
      const recentClassroomsDiv = document.getElementById('recent-classrooms');
      if (recentClassroomsDiv) {
        recentClassroomsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao carregar aulas: ${error.message}</p>
          </div>
        `;
      }
    }
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function closeFullscreenTeacher() {
    const modal = document.getElementById('fullscreen-modal-teacher');
    if (modal) {
      modal.style.display = 'none';
    }
    if (window.fullscreenChartTeacher) {
      window.fullscreenChartTeacher.destroy();
      window.fullscreenChartTeacher = null;
    }
  }

  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFullscreenTeacher();
    }
  });

  // Exportar funções globais
  window.toggleFullscreenTeacher = toggleFullscreenTeacher;
  window.closeFullscreenTeacher = closeFullscreenTeacher;

})(); // Fechar IIFE


