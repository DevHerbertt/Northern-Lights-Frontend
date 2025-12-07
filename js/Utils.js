// utils.js

const API = "http://localhost:8080"; // substitua pelo endpoint real da sua API

export function renderMeets(meets) {
    // Adiciona CSS se não estiver presente
    if (!document.getElementById('meets-css')) {
        const style = document.createElement('style');
        style.id = 'meets-css';
        style.textContent = `

            p{
            color : black;
            }
            #recent-classrooms {
                display: grid;
                gap: 24px;
                grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                padding: 20px 0;
            }

            .meet-card {
                background: linear-gradient(145deg, #ffffff, #f8fafc);
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                overflow: hidden;
                padding: 0;
                border: 1px solid #e2e8f0;
                transition: all 0.3s ease;
                position: relative;
            }

            .meet-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
            }

            .meet-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                font-weight: 700;
                font-size: 1.2rem;
                text-align: center;
                position: relative;
            }

            .meet-header::after {
                content: "";
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 3px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 2px;
            }

            .meet-body {
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .meet-info {
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                border-left: 4px solid #3b82f6;
            }

            .meet-info p {
                margin: 8px 0;
                color: #374151;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .meet-info strong {
                color: #1f2937;
                font-weight: 600;
                min-width: 100px;
            }

            .recorded-link {
                background: linear-gradient(135deg, #dbeafe, #e0f2fe);
                border: 1px solid #bfdbfe;
                border-radius: 12px;
                padding: 16px;
                margin: 8px 0;
                border-left: 4px solid #3b82f6;
            }

            .recorded-link a {
                color: #1e40af;
                text-decoration: none;
                font-weight: 600;
                word-break: break-all;
                transition: color 0.2s ease;
            }

            .recorded-link a:hover {
                color: #1e3a8a;
                text-decoration: underline;
            }

            .btn {
                padding: 12px 20px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-size: 0.95rem;
                font-weight: 600;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                margin-top: 8px;
            }

            .btn-primary { 
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
            }

            .btn-primary:hover {
                background: linear-gradient(135deg, #1d4ed8, #1e40af);
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
            }

            .btn-secondary { 
                background: linear-gradient(135deg, #6b7280, #4b5563);
                color: white;
                box-shadow: 0 2px 10px rgba(107, 114, 128, 0.3);
            }

            .btn-secondary:hover {
                background: linear-gradient(135deg, #4b5563, #374151);
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(107, 114, 128, 0.4);
            }

            .empty-state {
                text-align: center;
                padding: 60px 20px;
                color: #6b7280;
            }

            .empty-icon {
                font-size: 4rem;
                margin-bottom: 20px;
                opacity: 0.7;
            }

            .empty-state h3 {
                color: #374151;
                margin: 0 0 12px 0;
                font-weight: 600;
                font-size: 1.3rem;
            }

            .empty-state p {
                margin: 0;
                font-size: 1rem;
                color: #6b7280;
            }

            /* Modal Styles */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(8px);
            }

            .modal-content {
                background: white;
                border-radius: 20px;
                padding: 30px;
                width: 90%;
                max-width: 450px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                animation: modalAppear 0.3s ease-out;
            }

            @keyframes modalAppear {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .modal-title {
                font-size: 1.4rem;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 20px 0;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            .modal-input {
                width: 100%;
                padding: 16px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                transition: all 0.3s ease;
                margin: 15px 0;
                box-sizing: border-box;
            }

            .modal-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 25px;
            }

            .modal-btn {
                padding: 12px 24px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-size: 0.95rem;
                font-weight: 600;
                transition: all 0.3s ease;
                min-width: 100px;
            }

            .modal-btn-cancel {
                background: #6b7280;
                color: white;
            }

            .modal-btn-cancel:hover {
                background: #4b5563;
                transform: translateY(-1px);
            }

            .modal-btn-save {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
            }

            .modal-btn-save:hover {
                background: linear-gradient(135deg, #059669, #047857);
                transform: translateY(-1px);
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
            }

            @media (max-width: 768px) {
                #recent-classrooms {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .meet-body {
                    padding: 20px;
                }

                .modal-content {
                    padding: 24px;
                    margin: 20px;
                }

                .modal-actions {
                    flex-direction: column;
                }

                .modal-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const container = document.getElementById("recent-classrooms");
    if (!container) return;
    container.innerHTML = "";

    if (!meets || meets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>Nenhuma aula recente</h3>
                <p>Não foram encontradas aulas realizadas recentemente.</p>
            </div>
        `;
        return;
    }

    meets.forEach(meet => {
        const card = document.createElement("div");
        card.className = "meet-card";

        card.innerHTML = `
            <div class="meet-header">Aula Realizada
             ${new Date(meet.dateTimeStart).toLocaleString('pt-BR', { 
                            day:'2-digit', 
                            month:'2-digit', 
                            year:'numeric', 
                            hour:'2-digit', 
                            minute:'2-digit' 
                        })}
                        
            </div>
            <div class="meet-body">
                <div class="meet-info">
                    <p>
                        <strong>⏰ Fim:</strong> 
                        ${new Date(meet.dateTimeEnd).toLocaleString('pt-BR', { 
                            day:'2-digit', 
                            month:'2-digit', 
                            year:'numeric', 
                            hour:'2-digit', 
                            minute:'2-digit' 
                        })}
                    </p>
                    <p>
                        <strong>👥 Presentes:</strong> 
                        ${meet.presentInClass || 0}
                    </p>
                </div>
                ${meet.linkRecordClass ? `
                    <div class="recorded-link">
                        <strong style = "color: black">🎥 Aula Gravada:</strong><br>
                        <a href="${meet.linkRecordClass}" target="_blank">${meet.linkRecordClass}</a>
                    </div>
                ` : ''}
                <button class="btn ${meet.linkRecordClass ? 'btn-secondary' : 'btn-primary'}" data-meet-id="${meet.id}">
                    ${meet.linkRecordClass ? '✏️ Alterar Gravação' : '📹 Adicionar Gravação'}
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    // Adiciona event listener aos botões
    document.querySelectorAll("[data-meet-id]").forEach(btn => {
        btn.addEventListener('click', () => {
            const meetId = btn.getAttribute('data-meet-id');
            openRecordModal(meetId);
        });
    });
}

// Função para abrir modal de link
function openRecordModal(meetId) {
    // Remove modal antigo se existir
    const oldModal = document.getElementById('record-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'record-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">📹 Adicionar Link da Aula Gravada</h3>
            <input 
                id="record-link" 
                type="url" 
                placeholder="https://drive.google.com/... ou https://youtube.com/..." 
                class="modal-input"
            />
            <div class="modal-actions">
                <button id="cancel-btn" class="modal-btn modal-btn-cancel">Cancelar</button>
                <button id="save-btn" class="modal-btn modal-btn-save">✅ Salvar Link</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('cancel-btn').onclick = () => modal.remove();
    document.getElementById('save-btn').onclick = () => {
        const link = document.getElementById('record-link').value.trim();
        if (!link) return alert("Por favor, insira um link válido!");
        updateMeeting(meetId, link);
        modal.remove();
    };

    // Focar no input automaticamente
    setTimeout(() => {
        document.getElementById('record-link').focus();
    }, 100);
}

// Função para atualizar a aula no backend
async function updateMeeting(meetId, recordedLink) {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/meets/${meetId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ linkRecordClass: recordedLink })
        });

        if (!res.ok) throw new Error("Erro ao atualizar a aula");

        const updated = await res.json();
        console.log("Aula atualizada:", updated);

        // Atualiza visualmente o card
        const card = document.querySelector(`[data-meet-id='${meetId}']`).closest('.meet-card');
        const meetBody = card.querySelector('.meet-body');

        let linkDiv = card.querySelector('.recorded-link');
        if (!linkDiv) {
            linkDiv = document.createElement('div');
            linkDiv.className = 'recorded-link';
            const infoDiv = card.querySelector('.meet-info');
            meetBody.insertBefore(linkDiv, infoDiv.nextSibling);
        }
        linkDiv.innerHTML = `<strong>🎥 Aula Gravada:</strong><br><a href="${recordedLink}" target="_blank">${recordedLink}</a>`;

        const btn = card.querySelector('button');
        btn.textContent = "✏️ Alterar Gravação";
        btn.className = 'btn btn-secondary';

    } catch (err) {
        console.error(err);
        alert("Erro ao salvar o link da gravação!");
    }
}

// Expor função globalmente
window.renderMeets = renderMeets;


async function name(params) {
    
}