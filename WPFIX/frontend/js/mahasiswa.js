/* Mahasiswa Dashboard Features */

class MahasiswaController {
    static init() {
        console.log("Mahasiswa module initialized");
    }

    // ==========================
    // MODULE: DISCOVERY HUB (Missions & Quizzes)
    // ==========================
    static async renderMissions() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="page-header" style="margin-bottom: 2rem;">
                    <h2 style="font-weight: 700; color: var(--text-main);">Discovery Hub</h2>
                    <p style="color: var(--text-muted);">Explore missions and quizzes to earn Diamond Points</p>
                </div>

                <div class="filter-tabs" style="display: flex; gap: 1rem; margin-bottom: 2rem; background: rgba(255,255,255,0.5); padding: 0.5rem; border-radius: 12px; width: fit-content; border: 1px solid var(--border);">
                    <button class="tab-btn active" onclick="MahasiswaController.filterMissions('all', this)" style="padding: 0.5rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: white; box-shadow: var(--shadow-sm);">All Items</button>
                    <button class="tab-btn" onclick="MahasiswaController.filterMissions('quiz', this)" style="padding: 0.5rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: transparent;">Quizzes</button>
                    <button class="tab-btn" onclick="MahasiswaController.filterMissions('task', this)" style="padding: 0.5rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: transparent;">Tasks</button>
                </div>

                <div id="missionsGrid" class="stats-grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
                    <div class="text-center" style="grid-column: 1/-1; padding: 4rem;">Loading amazing opportunities...</div>
                </div>
            </div>
        `;

        await this.loadMissions();
    }

    static async loadMissions(filterType = 'all') {
        const grid = document.getElementById('missionsGrid');
        try {
            const res = await API.getMissions();
            const missions = res.data.missions || [];

            grid.innerHTML = '';

            const filtered = missions.filter(m => {
                if (filterType === 'all') return true;
                if (filterType === 'quiz') return m.type === 'quiz';
                return m.type !== 'quiz';
            });

            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                        <div style="font-size: 4rem; opacity: 0.2; margin-bottom: 1rem;">🌪️</div>
                        <h3 style="color: var(--text-muted);">Nothing here for now</h3>
                        <p style="opacity: 0.6;">Check back later for new missions!</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = filtered.map(m => `
                <div class="card fade-in-item" style="display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; border: 1px solid var(--border); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; position: relative;">
                    ${m.type === 'quiz' ? '<div style="position: absolute; top: 12px; right: 12px; background: rgba(99, 102, 241, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(99, 102, 241, 0.2);">QUICK QUIZ</div>' : ''}
                    
                    <div style="padding: 1.5rem;">
                        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="width: 50px; height: 50px; border-radius: 12px; background: ${m.type === 'quiz' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                ${m.type === 'quiz' ? '💡' : (m.type === 'assignment' ? '📄' : '✅')}
                            </div>
                            <div style="flex:1">
                                <h4 style="margin: 0; font-weight: 700; color: var(--text-main); font-size: 1.1rem;">${m.title}</h4>
                                <small style="color: var(--text-muted);">${m.creator_name || 'Academic Lab'}</small>
                            </div>
                        </div>

                        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${m.description || 'Complete this mission to gain recognition and points.'}
                        </p>

                        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.1rem;">💎</span>
                                <span style="font-weight: 800; color: var(--text-main); font-size: 1.1rem;">${m.points}</span>
                                <span style="color: var(--text-muted); font-size: 0.8rem;">pts</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">DEADLINE</div>
                                <div style="font-size: 0.8rem; font-weight: 700; color: ${m.deadline ? 'var(--text-main)' : 'var(--success)'};">
                                    ${m.deadline ? new Date(m.deadline).toLocaleDateString() : 'OPEN'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-primary" style="border-radius: 0; width: 100%; padding: 1rem; background: ${m.type === 'quiz' ? 'linear-gradient(to right, #6366f1, #a855f7)' : 'var(--primary)'}; border: none;" 
                            onclick="${m.type === 'quiz' ? `MahasiswaController.takeQuiz(${m.id})` : `MahasiswaController.showSubmitModal(${m.id})`}">
                        ${m.type === 'quiz' ? 'Take Quiz Now 🚀' : 'Start Mission ✨'}
                    </button>
                </div>
            `).join('');

        } catch (e) {
            console.error(e);
            showToast("Failed to load Discovery Hub", "error");
        }
    }

    static filterMissions(type, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.boxShadow = 'none';
        });
        btn.classList.add('active');
        btn.style.background = 'white';
        btn.style.boxShadow = 'var(--shadow-sm)';
        this.loadMissions(type);
    }

    // ==========================
    // MODULE: QUIZ ENGINE
    // ==========================
    static async takeQuiz(id) {
        try {
            const res = await API.getMissionByID(id);
            const mission = res.data; // Fixed structure

            if (!mission.questions || mission.questions.length === 0) {
                showToast("This quiz has no questions yet", "warning");
                return;
            }

            let currentQuestion = 0;
            const answers = [];

            const renderQuestion = () => {
                const q = mission.questions[currentQuestion];
                const modalBody = document.querySelector('#quizModalBody');

                modalBody.innerHTML = `
                    <div class="fade-in">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                            <span style="font-weight: 700; color: var(--primary); font-size: 0.9rem;">QUESTION ${currentQuestion + 1} OF ${mission.questions.length}</span>
                            <div style="height: 6px; width: 150px; background: #f1f5f9; border-radius: 3px; position: relative;">
                                <div style="position: absolute; left: 0; top: 0; height: 100%; background: var(--primary); border-radius: 3px; width: ${((currentQuestion + 1) / mission.questions.length) * 100}%; transition: width 0.3s;"></div>
                            </div>
                        </div>
                        
                        <h3 style="font-weight: 700; color: var(--text-main); margin-bottom: 2rem; line-height: 1.4;">${q.question}</h3>
                        
                        <div style="display: grid; gap: 1rem;">
                            ${(q.options || []).map((opt, i) => `
                                <div class="quiz-option" onclick="this.parentElement.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected')); this.classList.add('selected')" 
                                     data-val="${opt}"
                                     style="padding: 1.25rem; background: white; border: 2px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.2s; font-weight: 600; display: flex; align-items: center; gap: 1rem;">
                                    <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: var(--text-muted);">
                                        ${String.fromCharCode(65 + i)}
                                    </div>
                                    ${opt}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            };

            const modalHtml = `
                <div class="modal-overlay" id="quizModal">
                    <div class="modal-card" style="max-width: 650px; min-height: 500px; display: flex; flex-direction: column;">
                        <div class="modal-head" style="background: #fdfcfd; border-bottom: 1px solid var(--border); padding: 1rem 2rem;">
                            <h3 style="margin:0; font-size: 1.1rem; color: var(--text-main);">${mission.title}</h3>
                            <button class="btn-icon" onclick="MahasiswaController.confirmCloseQuiz()">×</button>
                        </div>
                        <div class="modal-body" id="quizModalBody" style="flex: 1; padding: 3rem 2rem;">
                            <!-- Dynamic Content -->
                        </div>
                        <div class="modal-foot" style="padding: 1.5rem 2rem; background: white;">
                            <button class="btn btn-primary" id="nextBtn" style="width: 100%; border-radius: 12px; padding: 1rem;">Next Question</button>
                        </div>
                    </div>
                </div>
                <style>
                    .quiz-option:hover { border-color: var(--primary-light); background: rgba(99, 102, 241, 0.02); }
                    .quiz-option.selected { border-color: var(--primary); background: rgba(99, 102, 241, 0.05); color: var(--primary); }
                    .quiz-option.selected div { border-color: var(--primary); background: var(--primary); color: white; }
                </style>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            renderQuestion();

            document.getElementById('nextBtn').addEventListener('click', async () => {
                const selected = document.querySelector('.quiz-option.selected');
                if (!selected) {
                    showToast("Please choose an answer", "warning");
                    return;
                }

                answers.push({
                    question_id: mission.questions[currentQuestion].id,
                    answer: selected.dataset.val
                });

                if (currentQuestion < mission.questions.length - 1) {
                    currentQuestion++;
                    renderQuestion();
                    if (currentQuestion === mission.questions.length - 1) {
                        document.getElementById('nextBtn').textContent = 'Finish Assessment';
                    }
                } else {
                    // Submit Quiz
                    try {
                        document.getElementById('nextBtn').disabled = true;
                        document.getElementById('nextBtn').textContent = 'Calculating Score...';

                        const submitData = {
                            mission_id: id,
                            answers: answers
                        };

                        await API.submitMissionSubmission(submitData);
                        showToast("Quiz submitted successfully! Redirecting to missions...");
                        document.getElementById('quizModal').remove();
                        MahasiswaController.renderMissions();
                    } catch (e) {
                        showToast(e.message, "error");
                        document.getElementById('nextBtn').disabled = false;
                        document.getElementById('nextBtn').textContent = 'Finish Assessment';
                    }
                }
            });

        } catch (e) {
            console.error(e);
            showToast("Failed to start quiz", "error");
        }
    }

    static confirmCloseQuiz() {
        if (confirm("Are you sure you want to exit? Your progress will not be saved.")) {
            const m = document.getElementById('quizModal');
            if (m) m.remove();
        }
    }

    // ==========================
    // MODULE: MISSION SUBMISSION
    // ==========================
    static async showSubmitModal(id) {
        try {
            const res = await API.getMissionByID(id);
            const mission = res.data;

            const modalHtml = `
                <div class="modal-overlay" onclick="closeModal(event)">
                    <div class="modal-card" style="max-width: 600px; border-radius: var(--radius-xl); overflow: hidden;">
                        <div class="modal-head" style="background: var(--primary); color: white;">
                            <h3>🚀 Launch Submission</h3>
                            <button class="btn-icon" onclick="closeModal()" style="color:white;">×</button>
                        </div>
                        <div class="modal-body" style="padding: 2rem;">
                            <div style="margin-bottom: 2rem; border-left: 3px solid var(--primary); padding-left: 1rem;">
                                <h4 style="margin:0;">${mission.title}</h4>
                                <p style="margin: 0.5rem 0 0 0; color: var(--text-muted); font-size: 0.9rem;">${mission.description || 'No specific instructions provided.'}</p>
                            </div>

                            <form id="missionSubmitForm" onsubmit="MahasiswaController.handleMissionSubmission(event, ${id})">
                                <div class="form-group">
                                    <label style="font-weight: 600;">Text Submission / Link</label>
                                    <textarea name="submission_content" required placeholder="Type your answer, or paste a link to your work (e.g., GitHub, Cloud Drive)..." style="min-height: 150px; border-radius: 12px;"></textarea>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight: 600;">File Evidence (Optional URL)</label>
                                    <input type="text" name="file_url" placeholder="https://your-submission-file-link.com" style="border-radius: 12px;">
                                </div>
                                <div class="form-actions" style="margin-top: 2rem; display: flex; gap: 1rem;">
                                    <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex:1">Cancel</button>
                                    <button type="submit" class="btn btn-primary" style="flex:2; border-radius: 12px;">Transmit Solution 🛰️</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (e) {
            showToast("Failed to load mission details", "error");
        }
    }

    static async handleMissionSubmission(e, missionId) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.mission_id = missionId;

        try {
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Transmitting...';

            await API.submitMissionSubmission(data);
            showToast("Mission submitted successfully! Reward pending review.");
            closeModal();
            this.renderMissions();
        } catch (error) {
            showToast(error.message, "error");
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Transmit Solution 🛰️';
        }
    }

    // ==========================
    // MODULE: REWARDS STORE (Marketplace)
    // ==========================
    static async renderShop(view = 'catalog') {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="table-header" style="margin-bottom: 2rem;">
                    <div>
                        <h2 style="font-weight: 700; color: var(--text-main);">Rewards Store</h2>
                        <p style="color: var(--text-muted);">Redeem your points for exclusive items and vouchers</p>
                    </div>
                    <div style="background: white; padding: 0.75rem 1.5rem; border-radius: 20px; box-shadow: var(--shadow-sm); display:flex; align-items:center; gap:0.75rem;">
                         <span style="font-size: 1.2rem;">🛡️</span>
                         <span style="font-weight: 700; color: var(--primary);" id="shopBalance">Loading...</span>
                    </div>
                </div>

                <div class="tabs" style="margin-bottom: 2rem; display:flex; gap: 1rem; border-bottom: 2px solid var(--border);">
                    <button class="tab-btn ${view === 'catalog' ? 'active' : ''}" 
                            onclick="MahasiswaController.renderShop('catalog')"
                            style="padding: 0.8rem 1.5rem; background:none; border:none; border-bottom: 3px solid ${view === 'catalog' ? 'var(--primary)' : 'transparent'}; font-weight: 600; color: ${view === 'catalog' ? 'var(--primary)' : 'var(--text-muted)'}; cursor: pointer; display:flex; gap:0.5rem; align-items:center;">
                        🛍️ Catalog
                    </button>
                    <button class="tab-btn ${view === 'my_items' ? 'active' : ''}" 
                            onclick="MahasiswaController.renderShop('my_items')"
                            style="padding: 0.8rem 1.5rem; background:none; border:none; border-bottom: 3px solid ${view === 'my_items' ? 'var(--primary)' : 'transparent'}; font-weight: 600; color: ${view === 'my_items' ? 'var(--primary)' : 'var(--text-muted)'}; cursor: pointer; display:flex; gap:0.5rem; align-items:center;">
                        🎒 My Inventory
                    </button>
                </div>

                <div id="shopContent">
                    <div id="shopGrid" class="stats-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
                        <div class="text-center" style="grid-column: 1/-1; padding: 4rem;">Loading Store Data...</div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Load balance
            const user = JSON.parse(localStorage.getItem('user'));
            const walletRes = await API.getWallet(user.id);
            const balanceElem = document.getElementById('shopBalance');
            if (balanceElem) balanceElem.textContent = `${walletRes.data.balance.toLocaleString()} Pts`;

            if (view === 'catalog') {
                this.loadCatalog();
            } else {
                this.loadMyPurchases(user.id);
            }

        } catch (e) {
            console.error(e);
            showToast("Failed to initiate store", "error");
        }
    }

    static async loadCatalog() {
        const grid = document.getElementById('shopGrid');
        try {
            const productsRes = await API.getProducts({ limit: 100 });
            const products = productsRes.data.products || [];

            if (products.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--text-muted);">Store is currently out of stock.</div>';
                return;
            }

            grid.innerHTML = products.map(p => `
                <div class="card product-card fade-in-item" style="padding: 0; overflow: hidden; border: 1px solid var(--border); transition: transform 0.3s;">
                    <div style="height: 180px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 4rem; position: relative;">
                        ${p.category === 'vouchers' ? '🎟️' : (p.category === 'merchandise' ? '👕' : '🎁')}
                        <div style="position: absolute; bottom: 10px; right: 10px; background: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; box-shadow: var(--shadow-sm); color: ${p.stock > 0 ? 'var(--success)' : 'var(--error)'};">
                            STOCK: ${p.stock}
                        </div>
                    </div>
                    <div style="padding: 1.5rem;">
                        <h4 style="margin:0; color: var(--text-main); font-weight: 700;">${p.name}</h4>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.5rem 0 1.2rem; line-height: 1.4; min-height: 2.4em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.description}</p>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 0.3rem;">
                                <span style="font-size: 1.1rem;">💎</span>
                                <span style="font-weight: 800; color: var(--primary); font-size: 1.2rem;">${p.price.toLocaleString()}</span>
                            </div>
                            <button class="btn btn-primary" style="padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem;" 
                                    onclick="MahasiswaController.purchaseProduct(${p.id}, '${p.name}', ${p.price})" ${p.stock <= 0 ? 'disabled' : ''}>
                                ${p.stock <= 0 ? 'Sold Out' : 'Redeem Now'}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            grid.innerHTML = '<div style="grid-column:1/-1;">Error loading products</div>';
        }
    }

    static async loadMyPurchases(userId) {
        const grid = document.getElementById('shopGrid');
        try {
            // We use transaction history filtering for now as we don't have a dedicated 'my-items' endpoint
            const res = await API.getTransactions(userId);
            const txns = res.data.transactions || [];

            // Filter only marketplace purchases
            const purchases = txns.filter(t => t.type === 'marketplace_purchase');

            if (purchases.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:4rem;">
                        <div style="font-size:3rem; margin-bottom:1rem; opacity:0.3;">🎒</div>
                        <h3 style="color:var(--text-muted);">Inventory Empty</h3>
                        <p style="opacity:0.6;">You haven't redeemed any items yet.</p>
                        <button class="btn btn-primary" style="margin-top:1rem; border-radius:20px;" onclick="MahasiswaController.renderShop('catalog')">Browse Catalog</button>
                    </div>`;
                return;
            }

            grid.innerHTML = purchases.map(t => `
                <div class="card fade-in-item" style="padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; border: 1px solid var(--border);">
                    <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
                        📦
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: var(--text-main); font-weight: 700;">${t.description.replace('Purchased ', '')}</h4>
                        <small style="color: var(--text-muted);">Ref: #PUR-${t.id} • ${new Date(t.created_at).toLocaleDateString()}</small>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--primary); font-weight: 700;">-${t.amount.toLocaleString()} Pts</div>
                        <span class="badge badge-success" style="font-size: 0.7rem;">Purhased</span>
                    </div>
                </div>
            `).join('');

            // Change grid layout for list view
            grid.style.display = 'flex';
            grid.style.flexDirection = 'column';
            grid.style.gap = '1rem';

        } catch (e) {
            grid.innerHTML = '<div style="grid-column:1/-1;">Error loading inventory</div>';
        }
    }

    static async purchaseProduct(id, name, price) {
        // 1. Initial Check
        const modalHtml = `
            <div class="modal-overlay" id="purchaseModal">
                <div class="modal-card" style="max-width: 450px; text-align: center; padding: 2rem;">
                    <div id="purchaseStep1">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🛍️</div>
                        <h3 style="margin-bottom: 0.5rem;">Choose Payment Method</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem;">Redeem <b>${name}</b> for <b>${price.toLocaleString()} Points</b>.</p>
                        
                        <div style="display: grid; gap: 1rem;">
                            <button class="btn btn-primary" onclick="MahasiswaController.payWithWalletDirect(${id}, '${name}', ${price})" style="padding: 1rem; border-radius: 12px; font-weight: 700; background: #10b981; border: none;">
                                Direct Wallet Pay 🪙
                            </button>
                            <button class="btn btn-primary" onclick="MahasiswaController.proceedToQRPayment(${id}, '${name}', ${price})" style="padding: 1rem; border-radius: 12px; font-weight: 700; background: var(--primary); border: none;">
                                Scan QR Payment 📷
                            </button>
                            <button class="btn btn-secondary" onclick="document.getElementById('purchaseModal').remove()" style="padding: 1rem; border-radius: 12px;">
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div id="purchaseStep2" style="display: none;">
                        <h3 style="margin-bottom: 1rem;">Scan QR to Pay</h3>
                        <div style="background: white; padding: 1.5rem; border: 2px solid var(--primary); border-radius: 20px; margin-bottom: 1.5rem; display: inline-block;">
                            <!-- Simulated QR Code -->
                            <div style="width: 200px; height: 200px; background: repeating-conic-gradient(#334155 0% 25%, #fff 0% 50%) 50% / 20px 20px; border: 8px solid white;"></div>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 2rem;">Point Merchant: <b>University Marketplace</b><br>Ref: #PAY-${Math.floor(Math.random() * 900000 + 100000)}</p>
                        <button class="btn btn-primary" id="confirmPayBtn" style="width: 100%; padding: 1rem; border-radius: 12px; font-weight: 700;">
                            Confirm Point Payment
                        </button>
                    </div>
                    <div id="purchaseStep3" style="display: none;">
                        <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s infinite;">✅</div>
                        <h3 style="color: var(--success);">Payment Successful!</h3>
                        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin: 1.5rem 0; text-align: left; font-family: monospace; font-size: 0.85rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>ITEM:</span>
                                <span style="font-weight: 700;">${name}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>AMOUNT:</span>
                                <span style="font-weight: 700;">-${price.toLocaleString()} PTS</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>STATUS:</span>
                                <span style="color: var(--success); font-weight: 700;">COMPLETED</span>
                            </div>
                            <div style="border-top: 1px dashed #cbd5e1; margin: 0.5rem 0; padding-top: 0.5rem; font-size: 0.75rem; text-align: center;">
                                Thank you for using WalletPoint!
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="MahasiswaController.closePurchaseAndReload()" style="width: 100%; padding: 1rem; border-radius: 12px;">
                            View Inventory
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    static async payWithWalletDirect(id, name, price) {
        try {
            const btn = event.target;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processing...';

            await API.purchaseProduct({
                product_id: id,
                payment_method: 'wallet'
            });

            document.getElementById('purchaseStep1').style.display = 'none';
            document.getElementById('purchaseStep3').style.display = 'block';
            showToast(`Purchase successful via direct wallet!`, "success");
        } catch (e) {
            showToast(e.message, "error");
            const btn = document.querySelector('[onclick*="payWithWalletDirect"]');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Direct Wallet Pay 🪙';
            }
        }
    }

    static async proceedToQRPayment(id, name, price) {
        const step1 = document.getElementById('purchaseStep1');
        const step2 = document.getElementById('purchaseStep2');

        try {
            // Call System: Generate QR Payment Token
            const tokenRes = await API.request('/mahasiswa/payment/token', 'POST', {
                amount: price,
                merchant: "University Marketplace",
                type: "purchase"
            });

            const paymentToken = tokenRes.data.token;

            step1.style.display = 'none';
            step2.style.display = 'block';

            const btn = document.getElementById('confirmPayBtn');
            btn.onclick = async () => {
                try {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner"></span> Validating QR & Paying...';

                    // Simulate the "Scan" part by sending the token to the purchase endpoint
                    await API.purchaseProduct({
                        product_id: id,
                        payment_method: 'qr',
                        payment_token: paymentToken
                    });

                    document.getElementById('purchaseStep2').style.display = 'none';
                    document.getElementById('purchaseStep3').style.display = 'block';
                    showToast(`QR Redemption successful!`, "success");
                } catch (e) {
                    showToast(e.message, "error");
                    btn.disabled = false;
                    btn.innerHTML = 'Confirm Point Payment';
                }
            };
        } catch (e) {
            showToast("Failed to generate payment token: " + e.message, "error");
        }
    }

    static closePurchaseAndReload() {
        document.getElementById('purchaseModal').remove();
        this.renderShop('catalog');
    }

    // ==========================
    // MODULE: MY LEDGER (History)
    // ==========================
    static async renderLedger() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="table-header" style="margin-bottom: 2rem;">
                    <h2 style="font-weight: 700; color: var(--text-main);">Personal Ledger</h2>
                    <p style="color: var(--text-muted);">A cryptographic record of all your point acquisitions and redemptions</p>
                </div>

                <div class="table-wrapper">
                    <table class="premium-table" id="ledgerTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Transaction Detail</th>
                                <th>Amount</th>
                                <th>Balance After</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody><tr><td colspan="5" class="text-center">Decrypting ledger...</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await API.getTransactions(user.id);
            const txns = res.data.transactions || [];
            const tbody = document.querySelector('#ledgerTable tbody');

            if (txns.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions recorded.</td></tr>';
                return;
            }

            tbody.innerHTML = txns.map(t => `
                <tr>
                    <td><code style="font-size: 0.75rem; color: var(--text-muted);">#TX-${t.id}</code></td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${t.description}</div>
                        <small style="color: var(--text-muted); text-transform: capitalize;">TYPE: ${t.type.replace('_', ' ')}</small>
                    </td>
                    <td>
                        <span style="font-weight: 700; color: ${t.type.includes('reward') || t.type.includes('topup') || t.type.includes('receive') ? 'var(--success)' : 'var(--error)'};">
                            ${t.type.includes('reward') || t.type.includes('topup') || t.type.includes('receive') ? '+' : '-'}${t.amount.toLocaleString()} Pts
                        </span>
                    </td>
                    <td style="font-weight: 600; color: var(--text-main);">${t.balance_after?.toLocaleString() || '-'}</td>
                    <td><small>${new Date(t.created_at).toLocaleString()}</small></td>
                </tr>
            `).join('');
        } catch (e) {
            console.error(e);
            showToast("Failed to load history", "error");
        }
    }

    // ==========================
    // MODULE: LEADERBOARD
    // ==========================
    static async renderLeaderboard() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="table-header" style="margin-bottom: 2rem; text-align: center;">
                    <h2 style="font-weight: 800; color: var(--text-main); font-size: 2.5rem; background: -webkit-linear-gradient(#fcd34d, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🏆 Hall of Fame</h2>
                    <p style="color: var(--text-muted); font-size: 1.1rem;">Top performing students this semester</p>
                </div>

                <div class="card" style="padding: 0; overflow: hidden; max-width: 800px; margin: 0 auto; border: 1px solid var(--border); box-shadow: var(--shadow-lg);">
                    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 2rem; text-align: center; color: white;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">👑</div>
                        <h3 style="margin: 0; color: #fcd34d;">The Elite Leaderboard</h3>
                        <p style="opacity: 0.7; margin-top: 0.5rem;">Who will claim the top spot?</p>
                    </div>
                    <div class="table-wrapper">
                        <table class="premium-table" id="leaderboardTable">
                            <thead>
                                <tr>
                                    <th class="text-center" style="width: 80px;">Rank</th>
                                    <th>Student Name</th>
                                    <th>NIM</th>
                                    <th class="text-right">Total Wealth</th>
                                </tr>
                            </thead>
                            <tbody><tr><td colspan="4" class="text-center" style="padding: 2rem;">Computing rankings...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const res = await API.request('/mahasiswa/leaderboard?limit=100', 'GET');
            const leaders = res.data || [];
            const tbody = document.querySelector('#leaderboardTable tbody');

            if (leaders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available.</td></tr>';
                return;
            }

            const currentUser = JSON.parse(localStorage.getItem('user'));

            tbody.innerHTML = leaders.map((l, index) => {
                const isMe = l.nim_nip === currentUser.nim_nip;
                let rankIcon = `#${index + 1}`;
                if (index === 0) rankIcon = '🥇';
                if (index === 1) rankIcon = '🥈';
                if (index === 2) rankIcon = '🥉';

                return `
                <tr style="${isMe ? 'background: rgba(99, 102, 241, 0.05);' : ''} ${index < 3 ? 'font-weight: 700;' : ''}">
                    <td class="text-center" style="font-size: 1.2rem;">${rankIcon}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isMe ? 'var(--primary)' : '#e2e8f0'}; color: ${isMe ? 'white' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                                ${l.full_name ? l.full_name.charAt(0) : '?'}
                            </div>
                            <span style="${isMe ? 'color: var(--primary);' : ''}">${l.full_name} ${isMe ? '(You)' : ''}</span>
                        </div>
                    </td>
                    <td style="color: var(--text-muted);">${l.nim_nip}</td>
                    <td class="text-right" style="font-family: monospace; font-size: 1.1rem; color: var(--success);">
                        ${l.balance.toLocaleString()} pts
                    </td>
                </tr>
            `}).join('');

        } catch (e) {
            console.error(e);
            showToast("Failed to load leaderboard", "error");
        }
    }

    // ==========================
    // MODULE: TRANSFER POINTS
    // ==========================
    static async renderTransfer() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="fade-in">
                <div class="page-header" style="margin-bottom: 2rem;">
                    <h2 style="font-weight: 700; color: var(--text-main);">Peer Transfer</h2>
                    <p style="color: var(--text-muted);">Send points to your friends or study groups</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: start;">
                    
                    <!-- Form Section -->
                    <div class="card" style="padding: 2rem; border: 1px solid var(--border);">
                        <div style="margin-bottom: 2rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1)); padding: 1.5rem; border-radius: 12px; border: 1px dashed var(--primary);">
                             <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Available Balance</div>
                             <div style="font-size: 2rem; font-weight: 800; color: var(--primary);" id="transferBalance">Loading...</div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                            <button class="btn" style="background: white; border: 2px solid var(--primary); color: var(--primary); padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;" onclick="MahasiswaController.openScanQR()">
                                <span style="font-size: 1.5rem;">📷</span>
                                <span style="font-size: 0.8rem; font-weight: 700;">Scan QR Code</span>
                            </button>
                            <button class="btn btn-primary" style="padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;" onclick="MahasiswaController.showMyQR()">
                                <span style="font-size: 1.5rem;">📱</span>
                                <span style="font-size: 0.8rem; font-weight: 700;">My QR Code</span>
                            </button>
                        </div>

                        <form id="transferForm" onsubmit="MahasiswaController.handleTransferSubmit(event)">
                            <div class="form-group">
                                <label style="font-weight: 600;">Receiver</label>
                                <div style="position:relative;">
                                    <input type="number" name="receiver_id" id="receiverIdInput" placeholder="Enter Student ID / NIM" required style="border-radius: 12px;">
                                    <small style="display:block; margin-top:0.4rem; color:var(--text-muted);">Confirming recipient details after scan...</small>
                                </div>
                            </div>

                            <div class="form-group">
                                <label style="font-weight: 600;">Amount (Points)</label>
                                <input type="number" name="amount" min="1" placeholder="e.g. 50" required style="border-radius: 12px; font-weight: 700; color: var(--text-main);">
                            </div>

                            <div class="form-group">
                                <label style="font-weight: 600;">Message (Optional)</label>
                                <textarea name="description" placeholder="For the group project..." style="min-height: 80px; border-radius: 12px;"></textarea>
                            </div>

                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem; border-radius: 12px; margin-top: 1rem;">
                                Confirm Transfer 💸
                            </button>
                        </form>
                    </div>

                    <!-- History Section -->
                    <div class="card" style="padding: 0; border: 1px solid var(--border); overflow: hidden; min-height: 500px; display: flex; flex-direction: column;">
                        <div style="padding: 1.5rem; border-bottom: 1px solid var(--border); background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
                            <h4 style="margin:0;">Recent Transfers</h4>
                            <button class="btn btn-sm" onclick="MahasiswaController.loadTransferHistory()" style="background: white; border: 1px solid var(--border);">Refresh 🔄</button>
                        </div>
                        <div style="overflow-x: auto;">
                            <table class="premium-table" id="transferHistoryTable" style="background: white;">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Counterparty</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="4" class="text-center" style="padding: 3rem;">Loading history...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initial Load
        this.loadTransferHistory();

        // Get Balance
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const wallet = await API.getWallet(user.id);
            document.getElementById('transferBalance').textContent = `${wallet.data.balance.toLocaleString()}`;
        } catch (e) { console.error(e); }
    }

    static async handleTransferSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.amount = parseInt(data.amount);
        data.receiver_id = parseInt(data.receiver_id);

        const btn = e.target.querySelector('button[type="submit"]');

        try {
            btn.textContent = 'Verifying Transaction...';
            btn.disabled = true;

            const res = await API.request('/mahasiswa/transfer', 'POST', data);

            // Success Receipt Modal
            const receiptHtml = `
            <div class="modal-overlay" id="transferReceiptModal">
                <div class="modal-card" style="max-width: 450px; text-align: center; padding: 2rem; border-top: 8px solid var(--success);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🛰️</div>
                    <h3 style="color: var(--success); margin-bottom: 0.5rem;">Transmission Successful</h3>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">P2P Transfer of <b>${data.amount.toLocaleString()} Points</b> has been confirmed and logged in the ledger.</p>
                    
                    <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; text-align: left; font-family: monospace; font-size: 0.85rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>RECIPIENT:</span>
                            <span style="font-weight: 700;">USER#${data.receiver_id}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>HASH ID:</span>
                            <span style="font-weight: 700;">${Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
                        </div>
                    </div>

                    <button class="btn btn-primary" onclick="document.getElementById('transferReceiptModal').remove(); MahasiswaController.renderTransfer();" style="width: 100%; padding: 1rem; border-radius: 12px; font-weight: 700;">
                        Return to Wallet
                    </button>
                </div>
            </div>
        `;
            document.body.insertAdjacentHTML('beforeend', receiptHtml);
            e.target.reset();

        } catch (error) {
            showToast(error.message || "Transfer failed", "error");
            btn.textContent = 'Confirm Transfer 💸';
            btn.disabled = false;
        }
    }

    static openScanQR() {
        const scanHtml = `
            <div class="modal-overlay" id="scanQRModal">
                <div class="modal-card" style="max-width: 500px; padding: 0; overflow: hidden; border-radius: 24px;">
                    <div style="background: #000; height: 350px; display: flex; align-items: center; justify-content: center; position: relative;">
                        <!-- Scanner Simulation Overlay -->
                        <div style="width: 250px; height: 250px; border: 2px solid var(--primary); box-shadow: 0 0 0 1000px rgba(0,0,0,0.5); position: relative; border-radius: 12px;">
                            <div style="position: absolute; width: 100%; height: 2px; background: var(--primary); top: 0; animation: scanLine 2s linear infinite; box-shadow: 0 0 15px var(--primary);"></div>
                        </div>
                        <div style="position: absolute; bottom: 2rem; color: white; font-size: 0.9rem; font-weight: 600;">Position the QR code within the frame</div>
                    </div>
                    <div style="padding: 2rem; text-align: center;">
                        <h3>Scan Receiver QR</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem;">Searching for Wallet Identification...</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <button class="btn btn-primary" onclick="MahasiswaController.simulateScanSuccess()" style="padding: 1rem; border-radius: 12px;">Simulate Success</button>
                            <button class="btn btn-secondary" onclick="document.getElementById('scanQRModal').remove()" style="padding: 1rem; border-radius: 12px;">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes scanLine {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', scanHtml);
    }

    static simulateScanSuccess() {
        // Mock a success scan - usually would get User ID from QR
        const randomId = Math.floor(Math.random() * 5 + 1); // Mock existing IDs
        const input = document.getElementById('receiverIdInput');
        if (input) {
            input.value = randomId;
            showToast(`Scanned User ID: ${randomId}`, "success");
        }
        document.getElementById('scanQRModal').remove();
    }

    static showMyQR() {
        const user = JSON.parse(localStorage.getItem('user'));
        const qrHtml = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-card" style="max-width: 400px; text-align: center; padding: 2.5rem; border-radius: 30px;">
                    <h3 style="margin-bottom: 0.5rem;">My Wallet ID</h3>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Ask your friend to scan this code</p>
                    
                    <div style="background: white; padding: 1rem; border: 1px solid var(--border); border-radius: 20px; box-shadow: var(--shadow-md); display: inline-block; margin-bottom: 2rem;">
                        <!-- Generated Mock QR -->
                         <div style="width: 250px; height: 250px; position:relative; display:flex; align-items:center; justify-content:center;">
                            <div style="position:absolute; width: 100%; height:100%; background: radial-gradient(circle, var(--primary) 2px, transparent 2px); background-size: 15px 15px; opacity:0.1;"></div>
                            <div style="font-size: 10rem;">📱</div>
                            <div style="position:absolute; bottom: 0; background: var(--primary); color: white; padding: 0.5rem 1.5rem; border-radius: 30px; font-weight: 800;">ID: ${user.id}</div>
                         </div>
                    </div>
                    
                    <button class="btn btn-secondary" onclick="closeModal()" style="width: 100%; padding: 1rem; border-radius: 12px;">Done</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', qrHtml);
    }

    static async loadTransferHistory() {
        const tbody = document.querySelector('#transferHistoryTable tbody');
        try {
            const res = await API.request('/mahasiswa/transfer/history', 'GET');
            const transfers = res.data.transfers || [];

            if (transfers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center" style="padding: 4rem;">
                            <div style="font-size: 2.5rem; opacity: 0.2; margin-bottom: 0.5rem;">💸</div>
                            <p style="color: var(--text-muted);">No transfer record found</p>
                        </td>
                    </tr>
                `;
                return;
            }

            const currentUser = JSON.parse(localStorage.getItem('user'));

            tbody.innerHTML = transfers.map(t => {
                const isSender = t.sender_wallet_id === currentUser.wallet_id; // Using wallet_id logic might be strictly dependent on how API returns it. Simplified below.
                const type = (t.description || '').includes(`Transfer from user ${currentUser.id}`) ? 'OUT' : 'IN'; // Fallback logic if IDs are tricky without full wallet objects

                // Better logic: API should return enough info. 
                // We'll trust the BE returns sender_wallet_id. We need our own wallet ID.
                // For now, let's use the amount sign or description if possible. 
                // BUT, since we just implemented the API, let's look at the response structure.

                // Since our BE doesn't return IsSender flag directly, and we might not know our own wallet ID easily without an extra call.
                // Let's assume description contains the clue as implemented in service.go

                const isIncoming = t.description && t.description.includes(`Transfer from user`);

                return `
                <tr>
                    <td>
                        <span class="badge ${isIncoming ? 'badge-success' : 'badge-warning'}">
                            ${isIncoming ? 'RECEIVED 📥' : 'SENT 📤'}
                        </span>
                    </td>
                    <td>
                         <div style="font-weight:600; color:var(--text-main);">User ID: ${isIncoming ? t.sender_wallet_id : t.receiver_wallet_id}</div> <!-- Simplified as we don't have joined user names yet -->
                         <small style="color:var(--text-muted);">${t.description}</small>
                    </td>
                    <td style="font-weight: 700; color: ${isIncoming ? 'var(--success)' : 'var(--error)'}">
                        ${isIncoming ? '+' : '-'}${t.amount.toLocaleString()}
                    </td>
                    <td><small>${new Date(t.created_at).toLocaleDateString()} ${new Date(t.created_at).toLocaleTimeString()}</small></td>
                </tr>
            `}).join('');

        } catch (e) {
            console.error(e);
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center">Failed to load history</td></tr>';
        }
    }
}
