// Gerenciamento de Estado
let state = {
    missions: [],
    priorityMissions: [],
    dailyProgress: 0,
    lastReset: new Date().toISOString(),
    history: [], // Histórico de missões completadas
    selectedDate: new Date()
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    checkDailyReset();
    startClock();
    renderMissions();
    initializeCalendar();

});

// Gerenciamento do Relógio
function startClock() {
    const updateClock = () => {
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59);
        
        const timeLeft = endOfDay - now;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        const clockDisplay = document.getElementById('clock-time');
        clockDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeLeft < 3600000) { // Última hora
            clockDisplay.style.color = '#FF0000';
            clockDisplay.style.animation = 'pulse 1s infinite';
        }
    };
    
    updateClock();
    setInterval(updateClock, 1000);
}

// Gerenciamento do Calendário
function initializeCalendar() {
    const calendar = document.getElementById('calendar');
    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    let calendarHTML = '<div class="calendar-header">';
    weekDays.forEach(day => {
        calendarHTML += `<div class="weekday">${day}</div>`;
    });
    calendarHTML += '</div><div class="calendar-grid">';
    
    // Adicionar espaços vazios para os dias antes do primeiro dia do mês
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const hasEvents = state.missions.some(m => {
            const mDate = new Date(m.date);
            return mDate.getDate() === i;
        }) || state.priorityMissions.some(m => {
            const mDate = new Date(m.date);
            return mDate.getDate() === i;
        });
        
        calendarHTML += `
            <div class="calendar-day ${i === currentDate.getDate() ? 'current-day' : ''} ${hasEvents ? 'has-events' : ''}"
                 onclick="selectDate(${i})">
                ${i}
                ${hasEvents ? '<span class="event-dot"></span>' : ''}
            </div>`;
    }
    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;
}

function selectDate(day) {
    state.selectedDate = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), day);
    renderMissions();
}

// Gerenciamento de Missões
function addMission(isPriority = false) {
    const modal = document.getElementById('add-mission-modal');
    modal.style.display = 'block';
    modal.dataset.isPriority = isPriority;
}

function closeModal() {
    document.getElementById('add-mission-modal').style.display = 'none';
}

function saveMission() {
    const modal = document.getElementById('add-mission-modal');
    const title = document.getElementById('mission-title').value;
    const description = document.getElementById('mission-description').value;
    const isPriority = modal.dataset.isPriority === 'true';
    
    const mission = {
        id: Date.now(),
        title,
        description,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    if (isPriority) {
        state.priorityMissions.push(mission);
    } else {
        state.missions.push(mission);
    }
    
    saveToLocalStorage();
    renderMissions();
    closeModal();
    
    // Limpar campos
    document.getElementById('mission-title').value = '';
    document.getElementById('mission-description').value = '';
}

function toggleMission(id, isPriority) {
    const missions = isPriority ? state.priorityMissions : state.missions;
    const mission = missions.find(m => m.id === id);
    if (mission) {
        mission.completed = !mission.completed;
        mission.completedAt = mission.completed ? new Date().toISOString() : null;
        
        // Animação de conclusão
        const checkbox = document.querySelector(`[data-mission-id="${id}"] .checkbox`);
        if (checkbox) {
            checkbox.classList.toggle('checked');
        }
        
        updateProgress();
        saveToLocalStorage();
    }
}

// Renderização
let lastProgress = 0;

function playLevelUpSound() {
    const sound = document.getElementById('levelUpSound');
    if (sound) {
        sound.currentTime = 0; // Reinicia o áudio caso já tenha sido tocado
        sound.play().catch(error => console.log('Erro ao tocar áudio:', error));
    }
}

function updateProgress() {
    const totalMissions = state.missions.length + state.priorityMissions.length;
    const completedMissions = state.missions.filter(m => m.completed).length + 
                            state.priorityMissions.filter(m => m.completed).length;
    
    if (totalMissions > 0) {
        state.dailyProgress = Math.round((completedMissions / totalMissions) * 100);
    } else {
        state.dailyProgress = 0;
    }

    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    progressFill.style.width = `${state.dailyProgress}%`;
    progressText.textContent = `${state.dailyProgress}% Completo`;
    
    // Verifica se todas as missões foram concluídas
    if (state.dailyProgress === 100 && lastProgress !== 100) {
        playLevelUpSound();
        // Adiciona uma classe temporária para animação
        progressFill.classList.add('completed');
        setTimeout(() => progressFill.classList.remove('completed'), 1500);
    }
    
    lastProgress = state.dailyProgress;
}

function renderMissions() {
    const priorityList = document.getElementById('priority-list');
    const missionList = document.getElementById('mission-list');
    
    // Renderizar missões prioritárias
    priorityList.innerHTML = state.priorityMissions
        .map(mission => createMissionElement(mission, true))
        .join('');
    
    // Renderizar missões normais
    missionList.innerHTML = state.missions
        .map(mission => createMissionElement(mission, false))
        .join('');
    
    updateProgress();
}

function deleteMission(id, isPriority) {
    const missions = isPriority ? state.priorityMissions : state.missions;
    const index = missions.findIndex(m => m.id === id);
    
    if (index !== -1) {
        missions.splice(index, 1);
        saveToLocalStorage();
        renderMissions();
    }
}

function createMissionElement(mission, isPriority) {
    return `
        <div class="mission-item" data-mission-id="${mission.id}">
            <div class="checkbox ${mission.completed ? 'checked' : ''}"
                 onclick="toggleMission(${mission.id}, ${isPriority})"></div>
            <div class="mission-content">
                <h3>${mission.title}</h3>
                ${mission.description ? `<p>${mission.description}</p>` : ''}
            </div>
            <button class="delete-mission" onclick="deleteMission(${mission.id}, ${isPriority})">
                ×
            </button>
        </div>`;
}

// Template generation/import functions
function generateTemplate() {
    const name = document.getElementById('template-name').value.trim();
    if (!name) {
        alert('Informe o nome do template');
        return;
    }
    const template = { name, priorityMissions: state.priorityMissions, missions: state.missions };
    document.getElementById('template-generated-code').value = JSON.stringify(template);
}

function importTemplate() {
    const code = document.getElementById('template-code-input').value.trim();
    if (!code) {
        alert('Cole o código para importar');
        return;
    }
    try {
        const template = JSON.parse(code);
        const titleEl = document.getElementById('template-title');
        titleEl.textContent = template.name;
        titleEl.style.display = 'block';
        state.priorityMissions = template.priorityMissions || [];
        state.missions = template.missions || [];
        saveToLocalStorage();
        renderMissions();
    } catch (e) {
        alert('Código inválido. Verifique e tente novamente.');
    }
}

// Persistência
function saveToLocalStorage() {
    localStorage.setItem('missionState', JSON.stringify(state));
}

function checkDailyReset() {
    const now = new Date();
    const lastReset = new Date(state.lastReset);
    
    // Verifica se é um novo dia
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
        
        // Salva missões completadas no histórico
        const completedMissions = [...state.missions, ...state.priorityMissions]
            .filter(m => m.completed)
            .map(m => ({
                ...m,
                completedDate: m.completedAt,
                type: state.missions.includes(m) ? 'normal' : 'priority'
            }));
        
        state.history = [...state.history, ...completedMissions];
        
        // Reseta os checkmarks mas mantém as missões
        state.missions = state.missions.map(m => ({ ...m, completed: false, completedAt: null }));
        state.priorityMissions = state.priorityMissions.map(m => ({ ...m, completed: false, completedAt: null }));
        
        state.lastReset = now.toISOString();
        state.dailyProgress = 0;
        
        saveToLocalStorage();
    }
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('missionState');
    if (saved) {
        const loadedState = JSON.parse(saved);
        state = {
            ...state,
            missions: loadedState.missions || [],
            priorityMissions: loadedState.priorityMissions || [],
            dailyProgress: loadedState.dailyProgress || 0,
            lastReset: loadedState.lastReset || new Date().toISOString(),
            history: loadedState.history || []
        };
    }
}
