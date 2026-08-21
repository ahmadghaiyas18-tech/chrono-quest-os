/**
 * ChronoQuest OS — Main Application Orchestrator
 */

import { store } from './store.js';
import { GamificationEngine, BADGES, TITLES } from './gamification.js';
import { GeminiChatManager } from './chat.js';

class App {
    constructor() {
        this.gamification = new GamificationEngine(store);
        this.chatManager = new GeminiChatManager(store, this.gamification);
        this.currentFilter = 'all';

        this.init();
    }

    init() {
        this.bindEvents();
        this.applyTheme(store.getState().user.theme);
        this.startJakartaClock();
        
        // Initial Store Subscribe & Render
        store.subscribe(() => this.render());
        this.render();

        // Initial Lucide Icons Render
        this.refreshIcons();
    }

    refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    startJakartaClock() {
        const update = () => {
            const timeEl = document.getElementById('liveJakartaTime');
            const dateEl = document.getElementById('currentDateFull');
            if (timeEl) timeEl.textContent = store.getJakartaTimeString() + ' WIB';
            if (dateEl) dateEl.textContent = store.getJakartaFormattedDate();
        };
        update();
        setInterval(update, 1000);
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        const selector = document.getElementById('themeSelector');
        if (selector) selector.value = themeName;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-msg glass-card px-4 py-3 rounded-2xl border flex items-center gap-3 text-xs shadow-xl pointer-events-auto transition-all ${
            type === 'success' ? 'border-cyan-500/50 bg-cyan-950/80 text-cyan-200' :
            type === 'levelup' ? 'border-amber-500/50 bg-amber-950/80 text-amber-200' :
            'border-white/10 bg-slate-900/90 text-white'
        }`;

        const icon = type === 'success' ? 'check-circle' : type === 'levelup' ? 'sparkles' : 'info';
        toast.innerHTML = `
            <i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i>
            <span class="font-medium">${message}</span>
        `;

        container.appendChild(toast);
        this.refreshIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    triggerConfetti() {
        if (window.confetti) {
            window.confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    bindEvents() {
        // Theme selector
        document.getElementById('themeSelector')?.addEventListener('change', (e) => {
            const theme = e.target.value;
            this.applyTheme(theme);
            store.updateUser({ theme });
            this.gamification.playSound('click');
        });

        // Sound Toggle
        const toggleSound = () => {
            const current = store.getState().user.soundEnabled;
            store.updateUser({ soundEnabled: !current });
            this.updateSoundIcon(!current);
            this.showToast(!current ? '🔊 Suara Diaktifkan' : '🔇 Suara Dimatikan');
            if (!current) this.gamification.playSound('click');
        };
        document.getElementById('btnSoundToggle')?.addEventListener('click', toggleSound);
        document.getElementById('btnSoundMobile')?.addEventListener('click', toggleSound);

        // Sidebar Navigation Tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const target = tab.getAttribute('data-target');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                const activeContent = document.getElementById(target);
                if (activeContent) {
                    activeContent.classList.remove('hidden');
                }

                // Close mobile sidebar if open
                this.closeMobileSidebar();
                this.gamification.playSound('click');
                this.refreshIcons();
            });
        });

        // Mobile Sidebar Controls
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.remove('-translate-x-full');
            document.getElementById('sidebarOverlay')?.classList.remove('hidden');
        });
        document.getElementById('closeSidebarBtn')?.addEventListener('click', () => this.closeMobileSidebar());
        document.getElementById('sidebarOverlay')?.addEventListener('click', () => this.closeMobileSidebar());

        // Quest Filter Buttons
        document.querySelectorAll('.quest-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quest-filter-btn').forEach(b => {
                    b.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-300');
                    b.classList.add('text-slate-400');
                });
                btn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-300');
                btn.classList.remove('text-slate-400');

                this.currentFilter = btn.getAttribute('data-filter');
                this.renderQuests();
                this.gamification.playSound('click');
            });
        });

        // Add / Edit Quest Modal
        const modal = document.getElementById('questModal');
        const openModal = (id = null) => {
            document.getElementById('questForm')?.reset();
            const isEdit = typeof id === 'string' && id.length > 0;
            document.getElementById('questIdInput').value = isEdit ? id : '';
            document.getElementById('modalTitle').textContent = isEdit ? 'Edit Quest' : 'Buat Quest Baru';
            
            if (isEdit) {
                const quest = store.getState().quests.find(q => q.id === id);
                if (quest) {
                    document.getElementById('questTitleInput').value = quest.title || '';
                    document.getElementById('questDescInput').value = quest.description || '';
                    document.getElementById('questCategoryInput').value = quest.category || 'other';
                    document.getElementById('questDifficultyInput').value = quest.difficulty || 'medium';
                    document.getElementById('questTimeInput').value = quest.targetTime || '';
                }
            }

            modal?.classList.remove('hidden');
            setTimeout(() => modal?.classList.remove('opacity-0'), 10);
            this.gamification.playSound('click');
        };
        const closeModal = () => {
            modal?.classList.add('opacity-0');
            setTimeout(() => modal?.classList.add('hidden'), 200);
        };

        // Delete Quest Confirm Modal
        const deleteQuestModal = document.getElementById('deleteQuestConfirmModal');
        const openDeleteQuestModal = (id) => {
            document.getElementById('deleteQuestIdInput').value = id;
            deleteQuestModal?.classList.remove('hidden');
            setTimeout(() => deleteQuestModal?.classList.remove('opacity-0'), 10);
            this.gamification.playSound('click');
        };
        const closeDeleteQuestModal = () => {
            deleteQuestModal?.classList.add('opacity-0');
            setTimeout(() => deleteQuestModal?.classList.add('hidden'), 200);
        };

        this.openQuestModal = openModal;
        this.closeQuestModal = closeModal;
        this.openDeleteQuestModal = openDeleteQuestModal;
        this.closeDeleteQuestModal = closeDeleteQuestModal;

        window.openQuestModal = (id) => openModal(id);
        window.closeQuestModal = closeModal;
        window.openDeleteQuestModal = (id) => openDeleteQuestModal(id);
        window.closeDeleteQuestModal = closeDeleteQuestModal;
        window.toggleQuestCompletion = (id) => {
            const res = store.toggleQuestCompletion(id);
            if (res) {
                if (res.action === 'completed') {
                    this.gamification.playSound('complete');
                    this.showToast(`🎉 Quest selesai! +${res.expGained} XP didapatkan!`, 'success');
                    const progression = this.gamification.evaluateProgression();
                    if (progression.leveledUp) {
                        this.triggerConfetti();
                        this.gamification.playSound('levelup');
                        this.showToast(`⭐ LEVEL UP! Kamu sekarang Level ${progression.currentLevel} (${progression.title})!`, 'levelup');
                    }
                } else {
                    this.gamification.playSound('click');
                    this.showToast('Quest ditandai belum selesai.');
                }
            }
        };

        document.getElementById('btnOpenNewQuestModal')?.addEventListener('click', () => openModal());
        document.getElementById('closeQuestModalBtn')?.addEventListener('click', closeModal);
        document.getElementById('cancelQuestBtn')?.addEventListener('click', closeModal);

        document.getElementById('cancelDeleteQuestBtn')?.addEventListener('click', closeDeleteQuestModal);
        document.getElementById('confirmDeleteQuestBtn')?.addEventListener('click', () => {
            const id = document.getElementById('deleteQuestIdInput').value;
            if (id) {
                store.deleteQuest(id);
                this.showToast('🗑️ Quest berhasil dihapus.', 'info');
                this.gamification.playSound('click');
            }
            closeDeleteQuestModal();
        });

        // Quest Form Submit
        document.getElementById('questForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('questIdInput').value;
            const title = document.getElementById('questTitleInput').value.trim();
            const description = document.getElementById('questDescInput').value.trim();
            const category = document.getElementById('questCategoryInput').value;
            const difficulty = document.getElementById('questDifficultyInput').value;
            const targetTime = document.getElementById('questTimeInput').value;

            if (!title) return;

            if (id) {
                store.editQuest(id, { title, description, category, difficulty, targetTime });
                this.showToast('✅ Quest berhasil diperbarui!', 'success');
            } else {
                store.addQuest({ title, description, category, difficulty, targetTime });
                this.showToast('✨ Quest baru berhasil ditambahkan!', 'success');
            }
            closeModal();
            this.gamification.playSound('click');
        });

        // Gemini Chat Widget Interactions
        const chatPanel = document.getElementById('geminiChatPanel');
        const toggleChat = () => {
            const isHidden = chatPanel.classList.contains('hidden');
            if (isHidden) {
                // Open chat
                chatPanel.classList.remove('hidden');
                // Allow a tiny delay for display:block to register before applying opacity/scale transition
                setTimeout(() => {
                    chatPanel.classList.remove('opacity-0', 'scale-90');
                }, 10);
                this.scrollToChatBottom();
            } else {
                // Close chat
                chatPanel.classList.add('opacity-0', 'scale-90');
                // Wait for CSS transition to finish before hiding
                setTimeout(() => {
                    chatPanel.classList.add('hidden');
                }, 300);
            }
            this.gamification.playSound('click');
        };

        const minimizeChat = () => {
            chatPanel?.classList.toggle('chat-minimized');
            const button = document.getElementById('minimizeChatBtn');
            if (button) {
                const minimized = chatPanel?.classList.contains('chat-minimized');
                button.title = minimized ? 'Perbesar Chat' : 'Minimalkan Chat';
                button.innerHTML = `<i data-lucide="${minimized ? 'maximize-2' : 'minus'}" class="w-4 h-4 pointer-events-none"></i>`;
                this.refreshIcons();
            }
            this.gamification.playSound('click');
        };

        document.getElementById('toggleChatBtn')?.addEventListener('click', toggleChat);
        document.getElementById('closeChatBtn')?.addEventListener('click', toggleChat);
        document.getElementById('minimizeChatBtn')?.addEventListener('click', minimizeChat);
        
        document.getElementById('clearChatBtn')?.addEventListener('click', () => {
            store.clearChatHistory();
            this.renderChatMessages();
            this.showToast('Riwayat chat dibersihkan.');
        });

        // Chat Form Submit
        document.getElementById('chatForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            input.value = '';
            this.renderChatMessages(true); // render with loading state
            this.gamification.playSound('click');

            await this.chatManager.sendMessage(message);
            this.renderChatMessages(false);
            this.gamification.playSound('click');
        });

        // Chat Suggestion Chips
        document.querySelectorAll('.chat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.textContent.trim().replace(/^[^a-zA-Z0-9]+/, '');
                const input = document.getElementById('chatInput');
                if (input) {
                    input.value = text;
                    document.getElementById('chatForm')?.dispatchEvent(new Event('submit'));
                }
            });
        });

        // Saving Modal Events
        const savingModal = document.getElementById('savingModal');
        const openSavingModal = (id = null) => {
            document.getElementById('savingForm')?.reset();
            const isEdit = typeof id === 'string';
            document.getElementById('savingIdInput').value = isEdit ? id : '';
            document.getElementById('savingModalTitle').textContent = isEdit ? 'Edit Target Tabungan' : 'Buat Target Tabungan';
            
            if (isEdit) {
                const target = store.getState().savings.find(s => s.id === id);
                if (target) {
                    document.getElementById('savingTitleInput').value = target.title;
                    document.getElementById('savingTargetInput').value = target.targetAmount;
                    document.getElementById('savingDeadlineInput').value = target.deadline;
                }
            }
            
            savingModal?.classList.remove('hidden');
            setTimeout(() => savingModal?.classList.remove('opacity-0'), 10);
            this.gamification.playSound('click');
        };
        const closeSavingModal = () => {
            savingModal?.classList.add('opacity-0');
            setTimeout(() => savingModal?.classList.add('hidden'), 200);
        };

        document.getElementById('btnOpenNewSavingModal')?.addEventListener('click', () => openSavingModal());
        document.getElementById('closeSavingModalBtn')?.addEventListener('click', closeSavingModal);
        document.getElementById('cancelSavingBtn')?.addEventListener('click', closeSavingModal);

        document.getElementById('savingForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('savingIdInput').value;
            const title = document.getElementById('savingTitleInput').value.trim();
            const targetAmount = document.getElementById('savingTargetInput').value;
            const deadline = document.getElementById('savingDeadlineInput').value;

            if (!title) return;

            if (id) {
                store.editSavingTarget(id, { title, targetAmount, deadline });
                this.showToast('✅ Target tabungan diperbarui!', 'success');
            } else {
                store.addSavingTarget({ title, targetAmount, deadline });
                this.showToast('✨ Target tabungan baru dibuat!', 'success');
            }
            
            closeSavingModal();
            this.gamification.playSound('click');
        });

        // Deposit Modal
        const depositModal = document.getElementById('depositModal');
        const openDepositModal = (id) => {
            document.getElementById('depositForm')?.reset();
            document.getElementById('depositTargetIdInput').value = id;
            depositModal?.classList.remove('hidden');
            setTimeout(() => depositModal?.classList.remove('opacity-0'), 10);
            this.gamification.playSound('click');
        };
        const closeDepositModal = () => {
            depositModal?.classList.add('opacity-0');
            setTimeout(() => depositModal?.classList.add('hidden'), 200);
        };

        document.getElementById('closeDepositModalBtn')?.addEventListener('click', closeDepositModal);
        // Instant Deposit Buttons
        document.querySelectorAll('.btn-instant-deposit').forEach(btn => {
            btn.addEventListener('click', () => {
                const amountInput = document.getElementById('depositAmountInput');
                if (amountInput) {
                    const currentVal = Number(amountInput.value) || 0;
                    const addVal = Number(btn.getAttribute('data-amount'));
                    amountInput.value = currentVal + addVal;
                }
            });
        });

        document.getElementById('depositForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('depositTargetIdInput').value;
            const amount = Number(document.getElementById('depositAmountInput').value);
            const note = document.getElementById('depositNoteInput').value.trim();

            if (isNaN(amount) || amount <= 0) {
                this.showToast('Nominal tidak valid!', 'error');
                return;
            }

            const res = store.addDeposit(id, amount, note);
            if (res) {
                this.showToast(`💸 Berhasil menyetor ${this.formatCurrency(amount)}`, 'success');
                this.showXpFloat('+10 XP Tabungan');
                this.gamification.playSound('complete');
                const prog = this.gamification.evaluateProgression();
                if (prog.newBadges && prog.newBadges.length > 0) {
                    this.triggerConfetti();
                }
            } else {
                this.showToast('Gagal menyetor uang. Nominal tidak valid.', 'error');
            }
            closeDepositModal();
        });

        // History Modal
        const historyModal = document.getElementById('savingHistoryModal');
        const openHistoryModal = (id) => {
            const target = store.getState().savings.find(s => s.id === id);
            if (!target) return;
            
            document.getElementById('historyModalTitle').textContent = `Riwayat: ${this.escapeHtml(target.title)}`;
            
            const container = document.getElementById('savingHistoryContainer');
            if (target.deposits.length === 0) {
                container.innerHTML = `<p class="text-sm text-slate-400 py-4 text-center">Belum ada setoran.</p>`;
            } else {
                container.innerHTML = target.deposits.map(d => `
                    <div class="glass-card p-3 rounded-xl border border-white/5 flex items-center justify-between">
                        <div>
                            <p class="text-xs font-mono text-slate-400">${d.date} ${d.time}</p>
                            <p class="text-sm text-white font-medium">${this.escapeHtml(d.note || 'Setoran')}</p>
                        </div>
                        <div class="text-emerald-400 font-bold font-mono">+${this.formatCurrency(d.amount)}</div>
                    </div>
                `).join('');
            }
            
            historyModal?.classList.remove('hidden');
            setTimeout(() => historyModal?.classList.remove('opacity-0'), 10);
            this.gamification.playSound('click');
        };
        document.getElementById('closeHistoryModalBtn')?.addEventListener('click', () => {
            historyModal?.classList.add('opacity-0');
            setTimeout(() => historyModal?.classList.add('hidden'), 200);
        });

        // Bind functions to instance AND window for maximum reliability
        this.openSavingModal = openSavingModal;
        this.closeSavingModal = closeSavingModal;
        this.openDepositModal = openDepositModal;
        this.closeDepositModal = closeDepositModal;
        this.openHistoryModal = openHistoryModal;
        this.closeHistoryModal = () => {
            historyModal?.classList.add('opacity-0');
            setTimeout(() => historyModal?.classList.add('hidden'), 200);
        };
        this.togglePauseSaving = (id) => {
            store.togglePauseSaving(id);
            this.showToast('Status tabungan diubah.', 'info');
            this.gamification.playSound('click');
        };
        
        // Delete Confirm Modal Handlers
        const deleteModal = document.getElementById('deleteConfirmModal');
        const openDeleteConfirmModal = (id) => {
            document.getElementById('deleteTargetIdInput').value = id;
            deleteModal?.classList.remove('hidden');
            setTimeout(() => deleteModal?.classList.remove('opacity-0'), 10);
            this.gamification.playSound('click');
        };
        const closeDeleteConfirmModal = () => {
            deleteModal?.classList.add('opacity-0');
            setTimeout(() => deleteModal?.classList.add('hidden'), 200);
        };

        this.openDeleteConfirmModal = openDeleteConfirmModal;
        this.closeDeleteConfirmModal = closeDeleteConfirmModal;

        // Expose globally on window for inline handlers
        window.openSavingModal = (id) => openSavingModal(id);
        window.closeSavingModal = closeSavingModal;
        window.openDepositModal = (id) => openDepositModal(id);
        window.closeDepositModal = closeDepositModal;
        window.openHistoryModal = (id) => openHistoryModal(id);
        window.togglePauseSaving = (id) => this.togglePauseSaving(id);
        window.openDeleteConfirmModal = (id) => openDeleteConfirmModal(id);
        window.closeDeleteConfirmModal = closeDeleteConfirmModal;

        document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteConfirmModal);
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            const id = document.getElementById('deleteTargetIdInput').value;
            if (id) {
                store.deleteSavingTarget(id);
                this.showToast('🗑️ Target tabungan berhasil dihapus.', 'info');
                this.gamification.playSound('click');
            }
            closeDeleteConfirmModal();
        });

        // ==========================================
        // GLOBAL EVENT DELEGATION FOR ALL BUTTONS
        // ==========================================
        document.body.addEventListener('click', (e) => {
            // Quest Buttons
            const toggleQuestBtn = e.target.closest('.quest-toggle-btn');
            if (toggleQuestBtn) {
                e.stopPropagation();
                const qId = toggleQuestBtn.getAttribute('data-id');
                const res = store.toggleQuestCompletion(qId);
                if (res) {
                    if (res.action === 'completed') {
                        this.gamification.playSound('complete');
                        this.showXpFloat(`+${res.expGained} XP`);
                        this.showToast(`🎉 Quest selesai! +${res.expGained} XP didapatkan!`, 'success');
                        const progression = this.gamification.evaluateProgression();
                        if (progression.leveledUp) {
                            this.triggerConfetti();
                            this.gamification.playSound('levelup');
                            this.showToast(`⭐ LEVEL UP! Kamu sekarang Level ${progression.currentLevel} (${progression.title})!`, 'levelup');
                        }
                    } else {
                        this.gamification.playSound('click');
                        this.showToast('Quest ditandai belum selesai.');
                    }
                }
                return;
            }
            
            const editQuestBtn = e.target.closest('.edit-quest-btn');
            if (editQuestBtn) {
                e.stopPropagation();
                if (this.openQuestModal) this.openQuestModal(editQuestBtn.getAttribute('data-id'));
                return;
            }

            const deleteQuestBtn = e.target.closest('.delete-quest-btn');
            if (deleteQuestBtn) {
                e.stopPropagation();
                if (this.openDeleteQuestModal) this.openDeleteQuestModal(deleteQuestBtn.getAttribute('data-id'));
                return;
            }

            // Saving Buttons
            const depositBtn = e.target.closest('.saving-deposit-btn');
            if (depositBtn) {
                e.stopPropagation();
                if (this.openDepositModal) this.openDepositModal(depositBtn.getAttribute('data-id'));
                return;
            }

            const historyBtn = e.target.closest('.saving-history-btn');
            if (historyBtn) {
                e.stopPropagation();
                if (this.openHistoryModal) this.openHistoryModal(historyBtn.getAttribute('data-id'));
                return;
            }

            const editSavingBtn = e.target.closest('.saving-edit-btn');
            if (editSavingBtn) {
                e.stopPropagation();
                if (this.openSavingModal) this.openSavingModal(editSavingBtn.getAttribute('data-id'));
                return;
            }

            const pauseBtn = e.target.closest('.saving-pause-btn');
            if (pauseBtn) {
                e.stopPropagation();
                if (this.togglePauseSaving) this.togglePauseSaving(pauseBtn.getAttribute('data-id'));
                return;
            }

            const delSavingBtn = e.target.closest('.saving-delete-btn');
            if (delSavingBtn) {
                e.stopPropagation();
                if (this.openDeleteConfirmModal) this.openDeleteConfirmModal(delSavingBtn.getAttribute('data-id'));
                return;
            }
        });
    }

    closeMobileSidebar() {
        document.getElementById('sidebar')?.classList.add('-translate-x-full');
        document.getElementById('sidebarOverlay')?.classList.add('hidden');
    }

    updateSoundIcon(enabled) {
        const icon = document.getElementById('soundIcon');
        if (icon) {
            icon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
            this.refreshIcons();
        }
    }

    /**
     * Main Render Loop
     */
    render() {
        const state = store.getState();
        const todayKey = store.getJakartaDateKey();
        const user = state.user;

        // Render User Banner & Status
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userTitle').textContent = user.title;
        document.getElementById('userAvatar').textContent = user.avatar;
        document.getElementById('userLevelPill').textContent = `Lv.${user.level}`;
        document.getElementById('sidebarStreakText').textContent = `${user.streak} Hari Streak`;
        const streakFire = document.getElementById('sidebarStreakFire');
        if (streakFire) streakFire.classList.toggle('is-cold', user.streak < 1);
        
        document.getElementById('dashLevelNumber').textContent = user.level;
        document.getElementById('dashTitleBadge').textContent = user.title;

        // EXP calculations
        const nextExp = this.gamification.getExpForLevel(user.level);
        const expPct = Math.min(100, Math.round((user.currentExp / nextExp) * 100));
        const expRemaining = Math.max(0, nextExp - user.currentExp);

        document.getElementById('dashCurrentExp').textContent = user.currentExp;
        document.getElementById('dashNextExp').textContent = nextExp;
        document.getElementById('dashExpBar').style.width = `${expPct}%`;
        document.getElementById('dashExpRemaining').textContent = `${expRemaining} XP menuju Level ${user.level + 1}`;
        document.getElementById('dashExpPercentage').textContent = `${expPct}%`;

        // Multiplier
        const multiplier = (1 + Math.min(0.5, user.streak * 0.05)).toFixed(1);
        document.getElementById('dashMultiplierBadge').textContent = `${multiplier}x`;

        // Activity Circle & Counts
        const totalQuests = state.quests.length;
        const completedToday = state.quests.filter(q => q.completedDates.includes(todayKey)).length;
        const completionPct = totalQuests > 0 ? Math.round((completedToday / totalQuests) * 100) : 0;

        document.getElementById('dashCompletedCount').textContent = completedToday;
        document.getElementById('dashTotalCount').textContent = totalQuests;
        document.getElementById('todayCompletionBadge').textContent = `${completionPct}%`;
        document.getElementById('navQuestCount').textContent = `${completedToday}/${totalQuests}`;

        // SVG Ring animation (Circumference ~ 314.159)
        const circumference = 314.159;
        const offset = circumference - (completionPct / 100) * circumference;
        const circleEl = document.getElementById('dashCircleProgress');
        if (circleEl) {
            circleEl.style.strokeDashoffset = offset;
        }

        // Render sections
        this.renderQuests();
        this.renderFullQuestList();
        this.renderCategoryStats();
        this.renderStatsTab();
        this.renderBadgesAndTitles();
        this.renderChatMessages();
        this.renderSavings();

        this.refreshIcons();
    }

    formatCurrency(num) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    }

    showXpFloat(text) {
        const floatEl = document.createElement('div');
        floatEl.className = 'xp-float';
        floatEl.textContent = text;
        floatEl.style.left = `${Math.max(24, window.innerWidth - 190)}px`;
        floatEl.style.top = `${Math.max(88, window.innerHeight * 0.22)}px`;
        document.body.appendChild(floatEl);
        setTimeout(() => floatEl.remove(), 1200);
    }

    renderSavings() {
        const container = document.getElementById('savingsListContainer');
        if (!container) return;

        const savings = store.getState().savings || [];
        let totalSavings = 0;
        let activeCount = 0;

        if (savings.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center glass-card rounded-2xl border-dashed border-emerald-500/30 text-slate-400">
                    <i data-lucide="piggy-bank" class="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60"></i>
                    <p class="font-medium text-sm">Belum ada target tabungan.</p>
                </div>
            `;
            document.getElementById('statTotalSavings').textContent = 'Rp 0';
            document.getElementById('statActiveSavings').textContent = '0';
            return;
        }

        container.innerHTML = savings.map(target => {
            const totalCollected = target.deposits.reduce((sum, d) => sum + d.amount, 0);
            totalSavings += totalCollected;
            if (target.status === 'active') activeCount++;

            const pctRaw = target.targetAmount > 0 ? (totalCollected / target.targetAmount) * 100 : 0;
            const pct = Math.min(100, Math.round(pctRaw));
            const isCompleted = target.status === 'completed' || pct >= 100;
            const isPaused = target.status === 'paused';
            
            const remaining = Math.max(0, target.targetAmount - totalCollected);
            const recentDeposits = target.deposits.slice(0, 3);
            
            let statusBadge = '';
            if (isCompleted) {
                statusBadge = '<span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">Selesai</span>';
            } else if (isPaused) {
                statusBadge = '<span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">Jeda</span>';
            } else {
                statusBadge = '<span class="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">Aktif</span>';
            }

            // Calculate remaining days
            let daysText = '-';
            if (target.deadline) {
                const diffTime = new Date(target.deadline) - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysText = diffDays > 0 ? `${diffDays} hari lagi` : (diffDays === 0 ? 'Hari ini' : 'Terlewat');
            }

            // Generate bubbles for animation
            const bubbles = Array.from({length: 4}).map((_, i) => {
                const size = 6 + Math.random() * 6;
                const left = 5 + Math.random() * 90;
                const delay = Math.random() * 1.5;
                return `<div class="progress-bubble" style="width: ${size}px; height: ${size}px; left: ${left}%; animation-delay: ${delay}s;"></div>`;
            }).join('');

            return `
                <div class="glass-card p-5 md:p-6 rounded-3xl border ${isCompleted ? 'border-emerald-500/30' : (isPaused ? 'border-amber-500/20 opacity-75' : 'border-white/10 hover:border-emerald-500/40')} transition-all relative">
                    
                    <div class="flex flex-col md:flex-row justify-between gap-4 mb-4 relative z-10">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-bold text-white text-lg ${isCompleted ? 'text-emerald-400' : ''}">${this.escapeHtml(target.title)}</h4>
                                ${statusBadge}
                            </div>
                            <p class="text-xs text-slate-400 font-mono">Tenggat: <span class="text-slate-300">${target.deadline || 'Tidak ada'}</span> (${daysText})</p>
                        </div>
                        <div class="flex items-center gap-2 self-start relative z-[9999]">
                            <button data-id="${target.id}" class="saving-deposit-btn cursor-pointer px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-95 flex items-center gap-1 ${isCompleted ? 'hidden' : ''}">
                                <i data-lucide="plus" class="w-3.5 h-3.5 inline pointer-events-none"></i> Setor
                            </button>
                            <div class="flex bg-slate-900/90 rounded-xl border border-white/10 overflow-hidden shadow-lg relative z-[9999]">
                                <button data-id="${target.id}" class="saving-history-btn cursor-pointer p-2.5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Riwayat Setoran">
                                    <i data-lucide="list" class="w-4 h-4 pointer-events-none"></i>
                                </button>
                                <button data-id="${target.id}" class="saving-edit-btn cursor-pointer p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all border-l border-white/10 active:scale-95" title="Edit Target & Deadline">
                                    <i data-lucide="edit-2" class="w-4 h-4 pointer-events-none"></i>
                                </button>
                                <button data-id="${target.id}" class="saving-pause-btn cursor-pointer p-2.5 text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-all border-l border-white/10 active:scale-95 ${isCompleted ? 'hidden' : ''}" title="${isPaused ? 'Lanjutkan Menabung' : 'Jeda Sementara'}">
                                    <i data-lucide="${isPaused ? 'play' : 'pause'}" class="w-4 h-4 pointer-events-none"></i>
                                </button>
                                <button data-id="${target.id}" class="saving-delete-btn cursor-pointer p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border-l border-white/10 active:scale-95" title="Hapus Target">
                                    <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Progress Bar Area -->
                    <div class="space-y-2 relative z-10">
                        <div class="flex justify-between text-xs font-mono">
                            <span class="text-white font-bold">${this.formatCurrency(totalCollected)}</span>
                            <span class="text-slate-400">Target: ${this.formatCurrency(target.targetAmount)}</span>
                        </div>
                        
                        <div class="h-5 w-full bg-slate-900/90 rounded-full p-1 border border-white/10 overflow-hidden relative shadow-inner">
                            <div class="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : (isPaused ? 'bg-amber-500/50' : 'bg-gradient-to-r from-emerald-500 to-cyan-500')}" style="width: ${pct}%">
                                ${(!isPaused && pct > 0 && pct < 100) ? bubbles : ''}
                            </div>
                        </div>
                        
                        <div class="flex justify-between text-[11px] font-mono text-slate-400">
                            <span>Sisa: ${this.formatCurrency(remaining)}</span>
                            <span class="${isCompleted ? 'text-emerald-400 font-bold' : ''}">${pct}%</span>
                        </div>
                    </div>

                    <div class="mt-5 pt-4 border-t border-white/10 relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Setoran terakhir</span>
                            <button data-id="${target.id}" class="saving-history-btn text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Lihat semua</button>
                        </div>
                        ${recentDeposits.length ? `<div class="space-y-1.5">${recentDeposits.map(d => `
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-400 truncate pr-3">${this.escapeHtml(d.note || 'Setoran')} <span class="text-slate-600 font-mono">${d.date}</span></span>
                                <span class="text-emerald-400 font-mono font-bold whitespace-nowrap">+${this.formatCurrency(d.amount)}</span>
                            </div>`).join('')}</div>` : '<p class="text-xs text-slate-500">Belum ada jejak setoran.</p>'}
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('statTotalSavings').textContent = this.formatCurrency(totalSavings);
        document.getElementById('statActiveSavings').textContent = activeCount;
    }

    renderQuests() {
        const container = document.getElementById('questListContainer');
        if (!container) return;

        const state = store.getState();
        const todayKey = store.getJakartaDateKey();

        let list = state.quests;
        if (this.currentFilter === 'pending') {
            list = list.filter(q => !q.completedDates.includes(todayKey));
        } else if (this.currentFilter === 'completed') {
            list = list.filter(q => q.completedDates.includes(todayKey));
        }

        if (list.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center glass-card rounded-2xl border-dashed border-white/10 text-slate-400">
                    <i data-lucide="sparkles" class="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-60"></i>
                    <p class="font-medium text-sm">Tidak ada quest di kategori ini.</p>
                </div>
            `;
            return;
        }

        const difficultyColors = {
            trivial: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
            easy: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
            medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            hard: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
            epic: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30'
        };

        const categoryIcons = {
            health: 'heart-pulse',
            learning: 'book-open',
            work: 'briefcase',
            mindfulness: 'smile',
            creative: 'palette',
            other: 'star'
        };

        container.innerHTML = list.map(quest => {
            const isDone = quest.completedDates.includes(todayKey);
            const diffClass = difficultyColors[quest.difficulty] || difficultyColors.medium;
            const iconName = categoryIcons[quest.category] || 'star';

            return `
                <div class="quest-item glass-card p-4 rounded-2xl border flex items-center justify-between gap-4 ${isDone ? 'completed border-white/5' : 'border-white/10'}">
                    <div class="flex items-center gap-3.5 flex-1 min-w-0">
                        <button class="quest-toggle-btn w-6 h-6 rounded-lg border ${isDone ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-white/20 hover:border-cyan-400 bg-slate-900/50'} flex items-center justify-center flex-shrink-0 transition-all cursor-pointer" data-id="${quest.id}">
                            ${isDone ? '<i data-lucide="check" class="w-4 h-4 stroke-[3] pointer-events-none"></i>' : ''}
                        </button>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="quest-title font-semibold text-sm text-white truncate ${isDone ? 'line-through text-slate-400' : ''}">${this.escapeHtml(quest.title)}</h4>
                            </div>
                            ${quest.description ? `<p class="text-xs text-slate-400 truncate mt-0.5">${this.escapeHtml(quest.description)}</p>` : ''}
                        </div>
                    </div>

                    <div class="flex items-center gap-2 flex-shrink-0 font-mono text-xs relative z-[9999]">
                        ${quest.targetTime ? `
                            <span class="hidden sm:inline-flex items-center gap-1 text-slate-400 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                                <i data-lucide="clock" class="w-3 h-3 text-cyan-400 pointer-events-none"></i> ${quest.targetTime}
                            </span>
                        ` : ''}
                        <span class="px-2 py-0.5 rounded-lg border font-bold ${diffClass}">
                            +${quest.exp} XP
                        </span>
                        <button class="edit-quest-btn p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-colors cursor-pointer" data-id="${quest.id}" title="Edit Quest">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                        </button>
                        <button class="delete-quest-btn p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer" data-id="${quest.id}" title="Hapus Quest">
                            <i data-lucide="trash" class="w-3.5 h-3.5 pointer-events-none"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    }

    renderFullQuestList() {
        const container = document.getElementById('fullQuestListContainer');
        const countEl = document.getElementById('totalActiveQuestsCount');
        if (!container) return;

        const state = store.getState();
        if (countEl) countEl.textContent = `${state.quests.length} Total Quest`;

        if (state.quests.length === 0) {
            container.innerHTML = `<p class="text-sm text-slate-400 py-4 text-center">Belum ada quest aktif.</p>`;
            return;
        }

        container.innerHTML = state.quests.map(q => `
            <div class="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                <div>
                    <h5 class="font-bold text-white text-sm">${this.escapeHtml(q.title)}</h5>
                    <p class="text-xs text-slate-400 mt-0.5">${this.escapeHtml(q.description || 'Tidak ada deskripsi')}</p>
                </div>
                <div class="flex items-center gap-2 text-xs font-mono">
                    <span class="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 capitalize">${q.category}</span>
                    <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">+${q.exp} XP</span>
                </div>
            </div>
        `).join('');
    }

    renderCategoryStats() {
        const container = document.getElementById('categoryStatsGrid');
        if (!container) return;

        const state = store.getState();
        const cats = [
            { id: 'health', name: 'Kesehatan', icon: 'heart-pulse', color: 'text-emerald-400' },
            { id: 'learning', name: 'Belajar', icon: 'book-open', color: 'text-cyan-400' },
            { id: 'work', name: 'Pekerjaan', icon: 'briefcase', color: 'text-amber-400' },
            { id: 'mindfulness', name: 'Mindfulness', icon: 'smile', color: 'text-purple-400' }
        ];

        container.innerHTML = cats.map(c => {
            const count = state.quests.filter(q => q.category === c.id).length;
            return `
                <div class="glass-card p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${c.color}">
                        <i data-lucide="${c.icon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">${c.name}</p>
                        <p class="text-lg font-bold font-mono text-white">${count}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStatsTab() {
        const state = store.getState();
        const history = state.history;

        document.getElementById('statTotalExp').textContent = `${state.user.totalExp} XP`;
        document.getElementById('statTotalCompleted').textContent = history.length;
        document.getElementById('statBestStreak').textContent = `${state.user.bestStreak} Hari`;

        const totalAttempts = state.quests.length * 7 || 1;
        const rate = Math.min(100, Math.round((history.length / totalAttempts) * 100));
        document.getElementById('statCompletionRate').textContent = `${rate}%`;

        // History Table
        const tbody = document.getElementById('historyTableBody');
        if (tbody) {
            if (history.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Belum ada riwayat penyelesaian quest.</td></tr>`;
            } else {
                tbody.innerHTML = history.slice(0, 15).map(h => {
                    const timeStr = new Date(h.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <tr class="hover:bg-white/[0.02] transition-colors">
                            <td class="py-3 px-4 text-slate-400">${h.dateKey} ${timeStr}</td>
                            <td class="py-3 px-4 text-white font-sans font-medium">${this.escapeHtml(h.questTitle)}</td>
                            <td class="py-3 px-4 uppercase text-slate-400">${h.difficulty}</td>
                            <td class="py-3 px-4 text-cyan-400 font-bold">+${h.expEarned} XP</td>
                            <td class="py-3 px-4 text-emerald-400 font-bold">✓ Selesai</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    renderBadgesAndTitles() {
        const state = store.getState();
        const user = state.user;

        // Badges
        const badgesEl = document.getElementById('badgesContainer');
        if (badgesEl) {
            badgesEl.innerHTML = BADGES.map(b => {
                const unlocked = user.unlockedBadges.includes(b.id);
                return `
                    <div class="glass-card p-4 rounded-2xl border ${unlocked ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 opacity-50'} flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-xl bg-slate-900 border ${unlocked ? 'border-amber-400/50 text-amber-300' : 'border-white/10 text-slate-600'} flex items-center justify-center text-2xl">
                            ${b.emoji}
                        </div>
                        <div>
                            <h5 class="font-bold text-sm text-white flex items-center gap-1.5">
                                ${b.title}
                                ${unlocked ? '<span class="text-[10px] font-mono text-emerald-400">✓ Terbuka</span>' : ''}
                            </h5>
                            <p class="text-xs text-slate-400 mt-0.5">${b.desc}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Titles
        const titlesEl = document.getElementById('titlesContainer');
        if (titlesEl) {
            titlesEl.innerHTML = TITLES.map(t => {
                const unlocked = user.level >= t.level;
                const isCurrent = user.title === t.title;
                return `
                    <div class="glass-card p-4 rounded-2xl border ${isCurrent ? 'border-cyan-400/50 bg-cyan-500/10' : unlocked ? 'border-white/10' : 'border-white/5 opacity-50'} flex items-center justify-between gap-3">
                        <div>
                            <span class="text-[10px] font-mono text-slate-400 uppercase">Syarat: Level ${t.level}</span>
                            <h5 class="font-bold text-sm text-white">${t.title}</h5>
                            <p class="text-xs text-cyan-400">${t.rank}</p>
                        </div>
                        ${isCurrent ? '<span class="text-xs px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-bold">Dipakai</span>' : ''}
                    </div>
                `;
            }).join('');
        }
    }

    renderChatMessages(isLoading = false) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const history = store.getState().chatHistory;

        let html = `
            <div class="flex gap-2.5 max-w-[90%]">
                <div class="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-cyan-300">
                    <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                </div>
                <div class="glass-card p-3 rounded-2xl rounded-tl-none border-cyan-500/20 text-slate-200 leading-relaxed">
                    Halo Petualang! Saya asisten AI bertenaga <strong>Gemini</strong>. Butuh saran quest harian, rekomendasi strategi konsistensi, atau motivasi menaikkan level? Tanyakan saja!
                </div>
            </div>
        `;

        html += history.map(msg => {
            if (msg.role === 'user') {
                return `
                    <div class="flex justify-end">
                        <div class="bg-gradient-to-r from-cyan-600 to-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] text-xs shadow-md">
                            ${this.escapeHtml(msg.content)}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="flex gap-2.5 max-w-[90%]">
                        <div class="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-cyan-300">
                            <i data-lucide="bot" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="glass-card p-3 rounded-2xl rounded-tl-none border-white/10 text-slate-200 leading-relaxed space-y-1">
                            ${this.formatMarkdown(msg.content)}
                        </div>
                    </div>
                `;
            }
        }).join('');

        if (isLoading) {
            html += `
                <div class="flex gap-2.5 max-w-[90%]">
                    <div class="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-cyan-300">
                        <i data-lucide="bot" class="w-3.5 h-3.5 animate-spin"></i>
                    </div>
                    <div class="glass-card p-3 rounded-2xl rounded-tl-none border-white/10 text-slate-400 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                        <span>AI sedang mengetik...</span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.scrollToChatBottom();
        this.refreshIcons();
    }

    scrollToChatBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMarkdown(text) {
        let safe = this.escapeHtml(text);
        // Bold **text**
        safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic *text*
        safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Line breaks
        safe = safe.replace(/\n/g, '<br/>');
        return safe;
    }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
