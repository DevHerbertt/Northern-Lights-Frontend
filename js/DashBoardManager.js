  const API = "http://localhost:8080";
  let token = localStorage.getItem("token");

  if (!token) {
    alert("Sem token! Faça login.");
    window.location.href = "login.html";
  }

  document.getElementById("teacher-name").innerText = "Teacher Logado";

  function authHeaders() {
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

        const response = await fetch(`http://localhost:8080/students/quantity`, {
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
        document.getElementById('total-students').textContent = total;

    } catch (error) {
        console.error("Erro ao buscar total de estudantes:", error);
    }
  }

  
  document.addEventListener('DOMContentLoaded', () => {
      getStudentsQuantity();
  });
 

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
  document.addEventListener("DOMContentLoaded", () => {
    getAllStudents();
    });


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

// Garantir que o DOM carregou antes de chamar
document.addEventListener("DOMContentLoaded", () => {
    loadTotalQuestions();
});

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
        console.log("Resposta do backend:", data);

        // Ajuste: se retornar { quantity: 42 } ou apenas 42
        const totalQuestions = typeof data === 'number' ? data : data.quantity;

        // Atualiza o HTML
        const totalQuestionsEl = document.getElementById('total-questions');
        if (totalQuestionsEl) {
            totalQuestionsEl.textContent = totalQuestions;
        } else {
            console.warn("Elemento #total-questions não encontrado no DOM");
        }

    } catch (error) {
        console.log("Erro ao buscar quantidade de questões:", error);
    }
}

// Garantir que o DOM carregou antes de chamar
document.addEventListener("DOMContentLoaded", () => {
    loadTotalQuestions();
});



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
        console.log("Numero de Respostas",total);
       document.getElementById('total-answers').textContent = total;

    } catch (error) {
        console.error("Erro ao buscar total respostas:", error);
    }
  }

  
  document.addEventListener('DOMContentLoaded', () => {
      getAnswerQuantity();
  });




  // ----- MEETINGS -----

import { renderMeets } from '../js/Utils.js';

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

        renderMeets(meets);

    } catch (error) {
        console.error("Erro ao buscar meets:", error);
    }
}

// ✅ Garantir que roda **depois do DOM estar pronto**
document.addEventListener("DOMContentLoaded", () => {
    getAllMeets();
});




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

  
  document.addEventListener('DOMContentLoaded', () => {
     getMeetingQuantity();
  });


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
document.addEventListener("DOMContentLoaded", () => {
 getAllTeacher();
  });


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

  
  document.addEventListener('DOMContentLoaded', () => {
      getTeacherQuantity();
  });


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


