/**
 * ChronoQuest OS — Store & State Management Module
 * Strict Source of Truth & LocalStorage Persistence with Asia/Jakarta (WIB) normalization.
 */

const STORAGE_KEY = 'chrono_quest_data_v2';
const TIMEZONE = 'Asia/Jakarta';

// Initial default state if first time opening
const DEFAULT_STATE = {
    user: {
        name: 'Time Adventurer',
        title: 'Chronos Initiate',
        avatar: '⚡',
        level: 1,
        currentExp: 0,
        totalExp: 0,
        streak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        soundEnabled: true,
        theme: 'cyber-glass',
        unlockedBadges: ['first_step'],
        unlockedTitles: ['Chronos Initiate']
    },
    quests: [
        {
            id: 'quest_1',
            title: 'Minum Air Mineral 2 Liter',
            description: 'Jaga hidrasi tubuh sepanjang hari untuk fokus maksimal.',
            category: 'health',
            difficulty: 'trivial',
            exp: 10,
            targetTime: '12:00',
            createdAt: new Date().toISOString(),
            completedDates: [] // Array of 'YYYY-MM-DD' in WIB
        },
        {
            id: 'quest_2',
            title: 'Deep Work / Belajar Fokus 45 Menit',
            description: 'Fokus tanpa gangguan gadget untuk menyelesaikan target utama.',
            category: 'learning',
            difficulty: 'medium',
            exp: 30,
            targetTime: '16:00',
            createdAt: new Date().toISOString(),
            completedDates: []
        },
        {
            id: 'quest_3',
            title: 'Olahraga Ringan / Peregangan 15 Menit',
            description: 'Gerakan tubuh untuk melancarkan sirkulasi darah.',
            category: 'health',
            difficulty: 'easy',
            exp: 20,
            targetTime: '18:00',
            createdAt: new Date().toISOString(),
            completedDates: []
        }
    ],
    history: [],
    chatHistory: [],
    savings: [
        {
            id: 'save_demo',
            title: 'Dana Darurat',
            targetAmount: 10000000,
            deadline: '2027-12-31',
            status: 'active',
            createdAt: new Date().toISOString(),
            deposits: []
        }
    ]
};

class QuestStore {
    constructor() {
        this.listeners = [];
        this.state = this.loadState();
        this.checkDayTransition();
    }

    /**
     * Get current date string formatted as YYYY-MM-DD in Asia/Jakarta timezone
     */
    getJakartaDateKey(date = new Date()) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(date);
    }

    /**
     * Get human readable Jakarta Date
     */
    getJakartaFormattedDate(date = new Date()) {
        const formatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: TIMEZONE,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return formatter.format(date);
    }

    /**
     * Get live Jakarta time string (HH:mm:ss)
     */
    getJakartaTimeString(date = new Date()) {
        const formatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        return formatter.format(date);
    }

    loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULT_STATE;
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_STATE,
                ...parsed,
                user: { ...DEFAULT_STATE.user, ...(parsed.user || {}) }
            };
        } catch (e) {
            console.error('Failed to load state from localStorage:', e);
            return DEFAULT_STATE;
        }
    }

    saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
            this.notify();
        } catch (e) {
            console.error('Failed to save state to localStorage:', e);
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }

    getState() {
        return this.state;
    }

    /**
     * Check if day transitioned to update streak status
     */
    checkDayTransition() {
        const todayKey = this.getJakartaDateKey();
        const lastDate = this.state.user.lastCompletedDate;
        
        if (lastDate && lastDate !== todayKey) {
            // Check if lastDate was yesterday
            const yesterday = new Date(Date.now() - 86400000);
            const yesterdayKey = this.getJakartaDateKey(yesterday);
            
            if (lastDate !== yesterdayKey) {
                // Streak broken
                this.state.user.streak = 0;
                this.saveState();
            }
        }
    }

    /**
     * CRUD Operations for Quests
     */
    addQuest(questData) {
        const difficultyExpMap = {
            trivial: 10,
            easy: 20,
            medium: 30,
            hard: 40,
            epic: 50
        };

        const newQuest = {
            id: 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: questData.title,
            description: questData.description || '',
            category: questData.category || 'other',
            difficulty: questData.difficulty || 'medium',
            exp: difficultyExpMap[questData.difficulty] || 30,
            targetTime: questData.targetTime || '',
            createdAt: new Date().toISOString(),
            completedDates: []
        };

        this.state.quests.unshift(newQuest);
        this.saveState();
        return newQuest;
    }

    editQuest(questId, questData) {
        const difficultyExpMap = {
            trivial: 10,
            easy: 20,
            medium: 30,
            hard: 40,
            epic: 50
        };
        const quest = this.state.quests.find(q => q.id === questId);
        if (quest) {
            quest.title = questData.title;
            quest.description = questData.description || '';
            quest.category = questData.category || 'other';
            quest.difficulty = questData.difficulty || 'medium';
            quest.exp = difficultyExpMap[quest.difficulty] || 30;
            quest.targetTime = questData.targetTime || '';
            this.saveState();
        }
    }

    deleteQuest(questId) {
        this.state.quests = this.state.quests.filter(q => q.id !== questId);
        this.saveState();
    }

    /**
     * CRUD Operations for Savings
     */
    addSavingTarget(data) {
        const newTarget = {
            id: 'save_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: data.title,
            targetAmount: Number(data.targetAmount) || 0,
            deadline: data.deadline || '',
            status: 'active', // active, paused, completed
            createdAt: new Date().toISOString(),
            deposits: []
        };
        this.state.savings.unshift(newTarget);
        this.saveState();
        return newTarget;
    }

    editSavingTarget(id, data) {
        const target = this.state.savings.find(s => s.id === id);
        if (target) {
            target.title = data.title;
            target.targetAmount = Number(data.targetAmount) || 0;
            target.deadline = data.deadline;
            
            // Check if completed after edit
            const totalCollected = target.deposits.reduce((sum, d) => sum + d.amount, 0);
            if (totalCollected >= target.targetAmount && target.status !== 'completed') {
                target.status = 'completed';
            } else if (totalCollected < target.targetAmount && target.status === 'completed') {
                target.status = 'active';
            }
            this.saveState();
        }
    }

    deleteSavingTarget(id) {
        this.state.savings = this.state.savings.filter(s => s.id !== id);
        this.saveState();
    }

    togglePauseSaving(id) {
        const target = this.state.savings.find(s => s.id === id);
        if (target && target.status !== 'completed') {
            target.status = target.status === 'paused' ? 'active' : 'paused';
            this.saveState();
        }
    }

    addDeposit(targetId, amount, note = '') {
        const target = this.state.savings.find(s => s.id === targetId);
        if (target) {
            const numAmount = Number(amount);
            if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) return null;

            const deposit = {
                id: 'dep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                date: this.getJakartaDateKey(),
                time: this.getJakartaTimeString(),
                amount: numAmount,
                note: note
            };
            target.deposits.unshift(deposit);

            // Check if completed
            const totalCollected = target.deposits.reduce((sum, d) => sum + d.amount, 0);
            if (totalCollected >= target.targetAmount && target.status !== 'completed') {
                target.status = 'completed';
            }
            this.saveState();
            return { target, deposit };
        }
        return null;
    }

    /**
     * Toggle completion of a quest for today (Asia/Jakarta)
     */
    toggleQuestCompletion(questId) {
        const todayKey = this.getJakartaDateKey();
        const quest = this.state.quests.find(q => q.id === questId);
        if (!quest) return null;

        const isCompleted = quest.completedDates.includes(todayKey);

        if (isCompleted) {
            // Uncheck
            quest.completedDates = quest.completedDates.filter(d => d !== todayKey);
            // Remove from history
            this.state.history = this.state.history.filter(h => !(h.questId === questId && h.dateKey === todayKey));
            
            // Deduct EXP
            const expDeduct = quest.exp;
            this.state.user.currentExp = Math.max(0, this.state.user.currentExp - expDeduct);
            this.state.user.totalExp = Math.max(0, this.state.user.totalExp - expDeduct);
            
            this.saveState();
            return { action: 'uncompleted', quest, expGained: -expDeduct };
        } else {
            // Complete quest
            quest.completedDates.push(todayKey);

            // Calculate EXP with Streak Multiplier
            const streakBonus = Math.min(0.5, (this.state.user.streak * 0.05)); // +5% per streak day up to +50%
            const expGained = Math.round(quest.exp * (1 + streakBonus));

            // Log to History
            const historyItem = {
                id: 'hist_' + Date.now(),
                questId: quest.id,
                questTitle: quest.title,
                difficulty: quest.difficulty,
                expEarned: expGained,
                completedAt: new Date().toISOString(),
                dateKey: todayKey
            };
            this.state.history.unshift(historyItem);

            // Update user streak if this is the first completion today
            if (this.state.user.lastCompletedDate !== todayKey) {
                const yesterday = new Date(Date.now() - 86400000);
                const yesterdayKey = this.getJakartaDateKey(yesterday);
                
                if (this.state.user.lastCompletedDate === yesterdayKey) {
                    this.state.user.streak += 1;
                } else {
                    this.state.user.streak = 1;
                }
                
                this.state.user.lastCompletedDate = todayKey;
                if (this.state.user.streak > this.state.user.bestStreak) {
                    this.state.user.bestStreak = this.state.user.streak;
                }
            }

            // Award EXP and handle Level Up
            this.state.user.currentExp += expGained;
            this.state.user.totalExp += expGained;

            this.saveState();
            return { action: 'completed', quest, expGained, streak: this.state.user.streak };
        }
    }

    updateUser(updates) {
        this.state.user = { ...this.state.user, ...updates };
        this.saveState();
    }

    addChatMessage(role, content) {
        const msg = {
            id: 'msg_' + Date.now(),
            role,
            content,
            timestamp: new Date().toISOString()
        };
        this.state.chatHistory.push(msg);
        this.saveState();
        return msg;
    }

    clearChatHistory() {
        this.state.chatHistory = [];
        this.saveState();
    }
}

export const store = new QuestStore();
