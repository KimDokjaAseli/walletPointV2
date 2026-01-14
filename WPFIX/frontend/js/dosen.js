class DosenController {
    static init() {
        console.log("Dosen module initialized");
    }

    static async loadDosenStats() {
        try {
            const missions = await API.getDosenMissions();
            const submissions = await API.getDosenSubmissions();

            const mElem = document.getElementById('stats-missions');
            const pElem = document.getElementById('stats-pending');
            const vElem = document.getElementById('stats-validated');

            if (mElem) mElem.textContent = missions.data.total || 0;
            if (pElem) {
                const pending = (submissions.data.submissions || []).filter(s => s.status === 'pending').length;
                pElem.textContent = pending;
            }
            if (vElem) {
                const approved = (submissions.data.submissions || []).filter(s => s.status === 'approved').length;
                vElem.textContent = approved;
            }
        } catch (e) {
            console.error("Failed to load dosen stats", e);
        }
    }

    // ==========================
    // MODULE: QUIZZES
    // ==========================
    static async renderQuizzes() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="table-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <h2 style="font-weight: 700; color: var(--text-main);">Quiz Management</h2>
                        <p style="color: var(--text-muted);">Create and manage interactive kuis for students</p>
                    </div>
                    <button class="btn btn-primary" onclick="DosenController.showQuizModal()">
                        <span style="font-size: 1.2rem;">+</span> Create New Quiz
                    </button>
                </div>

                <div class="table-wrapper">
                    <div style="overflow-x: auto;">
                        <table class="premium-table" id="quizzesTable">
                            <thead>
                                <tr>
                                    <th>Quiz Details</th>
                                    <th>Complexity</th>
                                    <th>Reward</th>
                                    <th>Schedule</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody><tr><td colspan="6" class="text-center">Loading Quizzes...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const result = await API.getDosenMissions({ type: 'quiz' });
            const quizzes = (result.data.missions || []).filter(m => m.type === 'quiz');
            const tbody = document.querySelector('#quizzesTable tbody');

            if (quizzes.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center" style="padding: 4rem 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">📝</div>
                            <h3 style="color: var(--text-muted);">No quizzes found</h3>
                            <p style="opacity: 0.6;">Start by creating your first interactive quiz.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = quizzes.map(q => `
                <tr class="fade-in-item">
                    <td>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(99, 102, 241, 0.1); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                💡
                            </div>
                            <div>
                                <strong style="font-size: 1rem; color: var(--text-main);">${q.title}</strong><br>
                                <small style="color: var(--text-muted); display: block; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${q.description || 'No instruction provided'}
                                </small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px solid rgba(99, 102, 241, 0.2);">
                            ${q.questions?.length || 0} Questions
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="color: #fbbf24; font-size: 1.1rem;">💎</span>
                            <span style="font-weight: 700; color: var(--text-main);">${q.points.toLocaleString()}</span>
                            <small style="color: var(--text-muted);">pts</small>
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.85rem;">
                            <div style="color: var(--text-main);">${q.deadline ? new Date(q.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'No Limit'}</div>
                            <small style="color: var(--text-muted);">${q.deadline ? new Date(q.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${q.status === 'active' ? 'badge-success' : 'badge-warning'}">
                            ${q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                        </span>
                    </td>
                    <td class="text-right">
                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button class="btn-icon" style="background: #f1f5f9;" onclick="DosenController.showQuizModal(${q.id})" title="Edit Quiz">
                                <span style="font-size: 0.9rem;">✏️</span>
                            </button>
                            <button class="btn-icon" style="background: rgba(239, 68, 68, 0.05); color: var(--error);" onclick="DosenController.deleteMission(${q.id})" title="Delete Quiz">
                                <span style="font-size: 0.9rem;">🗑️</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
            showToast("Failed to load quizzes", "error");
        }
    }

    static async showQuizModal(id = null) {
        let quiz = null;
        if (id) {
            try {
                const res = await API.getDosenMissions();
                quiz = res.data.missions.find(m => m.id === id);
            } catch (e) { console.error(e); }
        }

        const modalHtml = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-card" style="max-width: 1000px; width: 95%; height: 90vh; display: flex; flex-direction: column;">
                    <div class="modal-head" style="background: linear-gradient(to right, #6366f1, #a855f7); color: white; padding: 1.5rem 2rem;">
                        <div>
                            <h3 style="margin:0; font-weight: 700;">${id ? '📝 Edit Assessment' : '✨ Design New Quiz'}</h3>
                            <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; opacity: 0.9;">Configure questions and rewards for your students</p>
                        </div>
                        <button class="btn-icon" onclick="closeModal()" style="color: white; font-size: 1.5rem;">×</button>
                    </div>
                    
                    <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 2rem; background: #fdfcfd;">
                        <form id="quizForm" onsubmit="DosenController.handleQuizSubmit(event, ${id})">
                            <!-- Basic Config Card -->
                            <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--primary); padding: 1.5rem;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                                    <div>
                                        <div class="form-group">
                                            <label style="font-weight: 600; color: var(--text-main);">Quiz Identifier</label>
                                            <input type="text" name="title" value="${quiz?.title || ''}" required placeholder="e.g., Mathematics - Algebra Basics" style="border-radius: 10px;">
                                        </div>
                                        <div class="form-group">
                                            <label style="font-weight: 600; color: var(--text-main);">Guidelines & Description</label>
                                            <textarea name="description" placeholder="Mention quiz rules or context..." style="min-height: 100px; border-radius: 10px;">${quiz?.description || ''}</textarea>
                                        </div>
                                    </div>
                                    <div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                            <div class="form-group">
                                                <label style="font-weight: 600; color: var(--text-main);">Points Allocation</label>
                                                <div style="position: relative;">
                                                    <input type="number" name="points" value="${quiz?.points || 100}" required min="1" style="padding-left: 2.5rem; border-radius: 10px;">
                                                    <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5;">💎</span>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label style="font-weight: 600; color: var(--text-main);">Time Limit / Deadline</label>
                                                <input type="datetime-local" name="deadline" value="${quiz?.deadline ? new Date(quiz.deadline).toISOString().slice(0, 16) : ''}" style="border-radius: 10px;">
                                            </div>
                                        </div>
                                        <div style="background: rgba(99, 102, 241, 0.05); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--primary); border: 1px dashed var(--primary-light);">
                                            <strong>Pro Tip:</strong> Quizzes with higher points tend to have better student engagement. Ensure deadlines are reasonable!
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Questions Sections -->
                            <div id="questionsContainer">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                                    <h3 style="margin:0; color: var(--text-main); display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="background: var(--secondary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">?</span>
                                        Interactive Questions
                                    </h3>
                                    <button type="button" class="btn btn-primary" onclick="DosenController.addQuestionField()" style="padding: 0.5rem 1rem; font-size: 0.85rem; border-radius: 2rem;">
                                        + Add New Question
                                    </button>
                                </div>
                                <div id="questionsList">
                                    <!-- Dynamic fields -->
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="modal-foot" style="padding: 1.5rem 2rem; border-top: 1px solid var(--border); background: white; border-bottom-left-radius: var(--radius-xl); border-bottom-right-radius: var(--radius-xl);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">
                                ✨ Total Poin: <span id="pointsPreview" style="font-weight: 700; color: var(--primary);">${quiz?.points || 100}</span>
                            </div>
                            <div style="display: flex; gap: 1rem;">
                                <button type="button" class="btn btn-secondary" onclick="closeModal()" style="background: transparent; color: var(--text-muted);">Discard</button>
                                <button type="submit" form="quizForm" class="btn btn-primary" style="padding: 0.8rem 2.5rem; border-radius: 2rem;">
                                    ${id ? 'Update Assessment' : 'Launch Quiz 🚀'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Point preview sync
        document.querySelector('input[name="points"]').addEventListener('input', (e) => {
            document.getElementById('pointsPreview').textContent = e.target.value;
        });

        // Pre-fill questions
        if (quiz?.questions && quiz.questions.length > 0) {
            quiz.questions.forEach((q, idx) => this.addQuestionField(q, idx + 1));
        } else {
            this.addQuestionField(null, 1);
        }
    }

    static addQuestionField(data = null, index = null) {
        const container = document.getElementById('questionsList');
        if (!index) {
            index = container.children.length + 1;
        }

        const qId = Date.now() + Math.random();
        const html = `
            <div class="question-item card fade-in" style="padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); box-shadow: var(--shadow-sm); position: relative; border-radius: var(--radius-lg); transition: all 0.3s;" id="q-${qId}">
                <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 0.75rem; flex: 1; align-items: flex-start;">
                        <span style="font-weight: 800; color: var(--primary); font-size: 1.1rem; padding-top: 0.5rem;">Q${index}.</span>
                        <input type="text" class="question-text" placeholder="Enter your question here..." value="${data?.question || ''}" required 
                               style="font-size: 1.1rem; font-weight: 600; border: none; border-bottom: 2px solid #f1f5f9; padding: 0.5rem 0; border-radius: 0;">
                    </div>
                    <button type="button" class="btn-icon" style="color: var(--error); background: rgba(239, 68, 68, 0.05);" 
                            onclick="document.getElementById('q-${qId}').remove()" title="Remove Question">🗑️</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div style="position: relative;">
                        <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); font-weight: 700; color: #94a3b8;">A</span>
                        <input type="text" class="question-option" placeholder="Option A" value="${data?.options ? (data.options[0] || '') : ''}" required 
                               style="padding-left: 2.5rem; border-radius: 10px; border-color: rgba(99, 102, 241, 0.2);">
                    </div>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); font-weight: 700; color: #94a3b8;">B</span>
                        <input type="text" class="question-option" placeholder="Option B" value="${data?.options ? (data.options[1] || '') : ''}" required 
                               style="padding-left: 2.5rem; border-radius: 10px; border-color: rgba(99, 102, 241, 0.2);">
                    </div>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); font-weight: 700; color: #94a3b8;">C</span>
                        <input type="text" class="question-option" placeholder="Option C" value="${data?.options ? (data.options[2] || '') : ''}" 
                               style="padding-left: 2.5rem; border-radius: 10px; border-color: rgba(99, 102, 241, 0.2);">
                    </div>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); font-weight: 700; color: #94a3b8;">D</span>
                        <input type="text" class="question-option" placeholder="Option D" value="${data?.options ? (data.options[3] || '') : ''}" 
                               style="padding-left: 2.5rem; border-radius: 10px; border-color: rgba(99, 102, 241, 0.2);">
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: rgba(16, 185, 129, 0.05); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.1);">
                    <span style="font-size: 0.9rem; color: var(--success); font-weight: 600; white-space: nowrap;">🎯 Correct Answer:</span>
                    <input type="text" class="question-answer" placeholder="Exact match of correct option text" value="${data?.answer || ''}" required 
                           style="border: none; background: transparent; padding: 0.2rem 0; font-weight: 600; color: var(--success); border-bottom: 2px solid rgba(16, 185, 129, 0.2); border-radius: 0;">
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    }

    static async handleQuizSubmit(e, id) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.type = 'quiz';
        data.points = parseInt(data.points);

        // Collect questions
        const questionsList = [];
        document.querySelectorAll('.question-item').forEach(el => {
            const question = el.querySelector('.question-text').value;
            const options = Array.from(el.querySelectorAll('.question-option'))
                .map(o => o.value)
                .filter(v => v.trim() !== "");
            const answer = el.querySelector('.question-answer').value;
            questionsList.push({ question, options, answer });
        });

        if (questionsList.length === 0) {
            showToast("At least one question is required", "error");
            return;
        }

        data.questions = questionsList;

        if (data.deadline) {
            data.deadline = new Date(data.deadline).toISOString();
        } else {
            delete data.deadline;
        }

        try {
            if (id) {
                await API.updateMission(id, data);
            } else {
                await API.createMission(data);
            }
            showToast("Quiz published successfully");
            closeModal();
            DosenController.renderQuizzes();
        } catch (error) {
            showToast(error.message, "error");
        }
    }

    // ==========================
    // MODULE: MISSIONS
    // ==========================
    static async renderMissions() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="table-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <h2 style="font-weight: 700; color: var(--text-main);">Mission Workshops</h2>
                        <p style="color: var(--text-muted);">Coordinate tasks and assignments for student development</p>
                    </div>
                    <button class="btn btn-primary" onclick="DosenController.showMissionModal()">
                        <span style="font-size: 1.2rem;">+</span> New Workshop Task
                    </button>
                </div>

                <div class="table-wrapper">
                    <div style="overflow-x: auto;">
                        <table class="premium-table" id="missionsTable">
                            <thead>
                                <tr>
                                    <th>Task Identifier</th>
                                    <th>Category</th>
                                    <th>Reward</th>
                                    <th>Timeline</th>
                                    <th>Status</th>
                                    <th class="text-right">Manage</th>
                                </tr>
                            </thead>
                            <tbody><tr><td colspan="6" class="text-center">Synchronizing missions...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const result = await API.getDosenMissions();
            const missions = (result.data.missions || []).filter(m => m.type !== 'quiz');
            const tbody = document.querySelector('#missionsTable tbody');

            if (missions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center" style="padding: 4rem 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">🛠️</div>
                            <h3 style="color: var(--text-muted);">No missions active</h3>
                            <p style="opacity: 0.6;">Your laboratory of missions is currently empty.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = missions.map(m => `
                <tr class="fade-in-item">
                    <td>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                ${m.type === 'assignment' ? '📄' : '✅'}
                            </div>
                            <div>
                                <strong style="font-size: 1rem; color: var(--text-main);">${m.title}</strong><br>
                                <small style="color: var(--text-muted); display: block; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${m.description || 'No instruction details'}
                                </small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); text-transform: capitalize; border: 1px solid rgba(16, 185, 129, 0.2);">
                            ${m.type}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="color: #fbbf24; font-size: 1.1rem;">💎</span>
                            <span style="font-weight: 700; color: var(--text-main);">${m.points.toLocaleString()}</span>
                            <small style="color: var(--text-muted);">pts</small>
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.85rem;">
                            <div style="color: var(--text-main);">${m.deadline ? new Date(m.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Open Forever'}</div>
                            <small style="color: var(--text-muted);">${m.deadline ? new Date(m.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Expiry'}</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${m.status === 'active' ? 'badge-success' : 'badge-warning'}" style="border-radius: 20px;">
                            ${m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                    </td>
                    <td class="text-right">
                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button class="btn-icon" style="background: #f1f5f9;" onclick="DosenController.showMissionModal(${m.id})" title="Refine Task">
                                <span style="font-size: 0.9rem;">✏️</span>
                            </button>
                            <button class="btn-icon" style="background: rgba(239, 68, 68, 0.05); color: var(--error);" onclick="DosenController.deleteMission(${m.id})" title="Remove Task">
                                <span style="font-size: 0.9rem;">🗑️</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
            showToast("Failed to load workshop missions", "error");
        }
    }

    static async showMissionModal(id = null) {
        let mission = null;
        if (id) {
            try {
                const res = await API.getDosenMissions();
                mission = res.data.missions.find(m => m.id === id);
            } catch (e) { console.error(e); }
        }

        const modalHtml = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-card" style="max-width: 650px; width: 95%; overflow: hidden; border-radius: var(--radius-xl);">
                    <div class="modal-head" style="background: var(--primary); color: white; padding: 1.5rem 2rem;">
                        <div>
                            <h3 style="margin:0; font-weight: 700;">${id ? '🛠️ Refine Mission' : '✨ Architect New Mission'}</h3>
                            <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; opacity: 0.9;">Design a task to challenge your students</p>
                        </div>
                        <button class="btn-icon" onclick="closeModal()" style="color: white; font-size: 1.5rem;">×</button>
                    </div>

                    <div class="modal-body" style="padding: 2rem;">
                        <form id="missionForm" onsubmit="DosenController.handleMissionSubmit(event, ${id})">
                            <div class="form-group">
                                <label style="font-weight: 600; color: var(--text-main);">Project Name / Mission Title</label>
                                <input type="text" name="title" value="${mission?.title || ''}" required placeholder="e.g., Analysis of Financial Systems" style="border-radius: 10px;">
                            </div>
                            <div class="form-group">
                                <label style="font-weight: 600; color: var(--text-main);">Comprehensive Instructions</label>
                                <textarea name="description" placeholder="Provide clear steps for completion..." style="min-height: 120px; border-radius: 10px;">${mission?.description || ''}</textarea>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                                <div class="form-group">
                                    <label style="font-weight: 600; color: var(--text-main);">Task Category</label>
                                    <select name="type" style="border-radius: 10px; background-color: #f8fafc;">
                                        <option value="task" ${mission?.type === 'task' ? 'selected' : ''}>Standard Task</option>
                                        <option value="assignment" ${mission?.type === 'assignment' ? 'selected' : ''}>Laboratory Assignment</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight: 600; color: var(--text-main);">Wallet Reward (pts)</label>
                                    <div style="position: relative;">
                                        <input type="number" name="points" value="${mission?.points || 100}" required min="1" style="padding-left: 2.5rem; border-radius: 10px;">
                                        <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);">💎</span>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label style="font-weight: 600; color: var(--text-main);">Completion Deadline</label>
                                <input type="datetime-local" name="deadline" value="${mission?.deadline ? new Date(mission.deadline).toISOString().slice(0, 16) : ''}" style="border-radius: 10px;">
                            </div>

                            <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
                                <button type="button" class="btn" onclick="closeModal()" style="background: transparent; color: var(--text-muted);">Discard Changes</button>
                                <button type="submit" class="btn btn-primary" style="padding: 0.8rem 2rem; border-radius: 2rem; box-shadow: var(--shadow-md);">
                                    ${id ? 'Execute Update' : 'Launch Mission 🚀'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    static async handleMissionSubmit(e, id) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Ensure points is a valid positive number
        const points = parseInt(data.points, 10);
        if (isNaN(points) || points <= 0) {
            showToast("Reward points must be a positive number", "error");
            return;
        }
        data.points = points;

        if (data.deadline) {
            try {
                data.deadline = new Date(data.deadline).toISOString();
            } catch (err) {
                delete data.deadline;
            }
        } else {
            delete data.deadline;
        }

        try {
            if (id) {
                await API.updateMission(id, data);
                showToast("Mission updated successfully");
            } else {
                await API.createMission(data);
                showToast("Mission created successfully");
            }
            closeModal();
            DosenController.renderMissions();
        } catch (error) {
            showToast(error.message, "error");
        }
    }

    static async deleteMission(id) {
        if (!confirm("Are you sure you want to delete this mission?")) return;
        try {
            await API.deleteMission(id);
            showToast("Mission deleted");
            DosenController.renderMissions();
        } catch (error) {
            showToast(error.message, "error");
        }
    }

    // ==========================
    // MODULE: SUBMISSIONS
    // ==========================
    static async renderSubmissions(statusFilter = 'pending') {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="table-header" style="margin-bottom: 2rem;">
                    <h2 style="font-weight: 700; color: var(--text-main);">Validation Terminal</h2>
                    <p style="color: var(--text-muted);">Review student submissions and award points</p>
                </div>

                <div class="tabs" style="margin-bottom: 1.5rem; display:flex; gap: 1rem; border-bottom: 2px solid var(--border);">
                    <button class="tab-btn ${statusFilter === 'pending' ? 'active' : ''}" 
                            onclick="DosenController.renderSubmissions('pending')"
                            style="padding: 0.8rem 1.5rem; background:none; border:none; border-bottom: 3px solid ${statusFilter === 'pending' ? 'var(--primary)' : 'transparent'}; font-weight: 600; color: ${statusFilter === 'pending' ? 'var(--primary)' : 'var(--text-muted)'}; cursor: pointer;">
                        ⏳ Pending Review
                    </button>
                    <button class="tab-btn ${statusFilter !== 'pending' ? 'active' : ''}" 
                            onclick="DosenController.renderSubmissions('approved')"
                            style="padding: 0.8rem 1.5rem; background:none; border:none; border-bottom: 3px solid ${statusFilter !== 'pending' ? 'var(--primary)' : 'transparent'}; font-weight: 600; color: ${statusFilter !== 'pending' ? 'var(--primary)' : 'var(--text-muted)'}; cursor: pointer;">
                        ✅ History / Reviewed
                    </button>
                </div>

                <div class="table-wrapper">
                    <div style="overflow-x: auto;">
                        <table class="premium-table" id="submissionsTable">
                            <thead>
                                <tr>
                                    <th>Candidate Info</th>
                                    <th>Mission Origin</th>
                                    <th>Timestamp</th>
                                    <th>Status & Score</th>
                                    <th class="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody><tr><td colspan="5" class="text-center">Awaiting data stream...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            // Note: If 'approved', we might want to also see 'rejected'. Backend filter currently implies exact match.
            // For simplicity, let's carry the filter string. If user clicks History, we might defaulting to 'approved' but strictly we want completed.
            // But API might support status filter.

            let queryStatus = statusFilter;
            if (statusFilter !== 'pending') {
                // If viewing history, maybe we fetch all non-pending? 
                // Currently API implementation usually filters by exact status. 
                // Let's stick to the requested status for now.
            }

            const result = await API.getDosenSubmissions({ status: queryStatus, limit: 100 });
            let submissions = result.data.submissions || [];

            // If tab is history, we might want to merge approved & rejected if backend doesn't support generic 'completed' status
            // Assuming for now simple filter.

            const tbody = document.querySelector('#submissionsTable tbody');

            if (submissions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center" style="padding: 4rem 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">📭</div>
                            <h3 style="color: var(--text-muted);">No ${statusFilter} submissions</h3>
                            <p style="opacity: 0.6;">Your inbox for this category is empty.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = submissions.map(s => `
                <tr class="fade-in-item">
                    <td>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                                ${s.student_name ? s.student_name.charAt(0) : 'S'}
                            </div>
                            <div>
                                <strong style="color: var(--text-main);">${s.student_name}</strong><br>
                                <small style="color: var(--text-muted);">${s.student_nim}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--primary);">${s.mission_title}</div>
                    </td>
                    <td>
                        <div style="font-size: 0.85rem;">
                            <div style="color: var(--text-main);">${new Date(s.created_at).toLocaleDateString()}</div>
                            <small style="color: var(--text-muted);">${new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${s.status === 'pending' ? 'badge-warning' : (s.status === 'approved' ? 'badge-success' : 'badge-error')}" 
                              style="text-transform: capitalize;">
                            ${s.status}
                        </span>
                        ${s.status !== 'pending' ? `<span style="font-weight: 700; margin-left: 0.5rem; color: var(--text-main);">${s.score}/100</span>` : ''}
                    </td>
                    <td class="text-right">
                        ${s.status === 'pending'
                    ? `<button class="btn btn-primary" onclick="DosenController.showReviewModal(${s.id})" style="padding: 0.4rem 1.2rem; font-size: 0.85rem; border-radius: 20px;">Review Now</button>`
                    : `<button class="btn" onclick="DosenController.showReviewModal(${s.id})" style="padding: 0.4rem 1.2rem; font-size: 0.85rem; background: #f1f5f9; color: var(--text-muted);">View Details</button>`
                }
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
            showToast("Failed to fetch submissions", "error");
        }
    }

    static async showReviewModal(id) {
        try {
            const res = await API.getDosenSubmissions();
            const submission = res.data.submissions.find(s => s.id === id);

            const modalHtml = `
                <div class="modal-overlay" onclick="closeModal(event)">
                    <div class="modal-card" style="max-width: 750px; border-radius: var(--radius-xl); overflow: hidden;">
                        <div class="modal-head" style="background: #0f172a; color: white; padding: 1.5rem 2rem;">
                            <div>
                                <h3 style="margin:0;">Validate Work: ${submission.student_name}</h3>
                                <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; opacity: 0.7;">${submission.mission_title}</p>
                            </div>
                            <button class="btn-icon" onclick="closeModal()" style="color: white;">×</button>
                        </div>
                        <div class="modal-body" style="padding: 2rem; background: #f8fafc;">
                            <div class="card" style="margin-bottom: 2rem; padding: 1.5rem; background: white; border: 1px solid var(--border);">
                                <label style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 0.5rem;">Submission Artifacts</label>
                                <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.95rem; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${submission.content || 'No text content provided.'}</div>
                                ${submission.file_url ? `
                                    <div style="margin-top: 1rem;">
                                        <a href="${submission.file_url}" target="_blank" class="btn" style="background: var(--primary); color: white; font-size: 0.85rem; width: 100%;">
                                            View Attached Evidence 📎
                                        </a>
                                    </div>
                                ` : ''}
                            </div>

                            <form id="reviewForm" onsubmit="DosenController.handleReviewSubmit(event, ${id})">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                                    <div class="form-group">
                                        <label style="font-weight: 600;">Technical Score (0-100)</label>
                                        <input type="number" name="score" value="100" min="0" max="100" required style="border-radius: 10px;">
                                    </div>
                                    <div class="form-group">
                                        <label style="font-weight: 600;">Verdict</label>
                                        <select name="status" style="border-radius: 10px;">
                                            <option value="approved">✅ Approve & Reward</option>
                                            <option value="rejected">❌ Reject Submission</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight: 600;">Feedback & Mentorship Note</label>
                                    <textarea name="review_note" placeholder="Tell the student how they performed..." style="min-height: 100px; border-radius: 10px;"></textarea>
                                </div>
                                <div class="form-actions" style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: flex-end;">
                                    <button type="button" class="btn" onclick="closeModal()" style="background: transparent; color: var(--text-muted);">Cancel</button>
                                    <button type="submit" class="btn btn-primary" style="padding: 0.8rem 2.5rem; border-radius: 30px;">Finalize Review</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            showToast("Error loading details", "error");
        }
    }

    static async handleReviewSubmit(e, id) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.score = parseInt(data.score);

        try {
            await API.reviewSubmission(id, data);
            showToast(`Submission ${data.status} successfully`);
            closeModal();
            DosenController.renderSubmissions();
        } catch (error) {
            showToast(error.message, "error");
        }
    }
}
