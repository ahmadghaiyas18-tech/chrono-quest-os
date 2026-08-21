/**
 * ChronoQuest OS — Gamification Engine & Audio Synthesizer
 */

export const BADGES = [
    {
        id: 'first_step',
        title: 'Langkah Pertama',
        desc: 'Selesaikan 1 quest harian pertama.',
        icon: 'footprints',
        emoji: '🐾',
        check: (user, history) => history.length >= 1
    },
    {
        id: 'streak_3',
        title: 'Api Semangat',
        desc: 'Capai 3 hari streak berturut-turut.',
        icon: 'flame',
        emoji: '🔥',
        check: (user) => user.streak >= 3 || user.bestStreak >= 3
    },
    {
        id: 'streak_7',
        title: 'Pejuang Ritme',
        desc: 'Capai 7 hari streak berturut-turut.',
        icon: 'zap',
        emoji: '⚡',
        check: (user) => user.streak >= 7 || user.bestStreak >= 7
    },
    {
        id: 'level_5',
        title: 'Evolusi Diri',
        desc: 'Mencapai Level 5 dalam petualangan.',
        icon: 'trending-up',
        emoji: '📈',
        check: (user) => user.level >= 5
    },
    {
        id: 'level_10',
        title: 'Veteran Waktu',
        desc: 'Mencapai Level 10 kehormatan.',
        icon: 'crown',
        emoji: '👑',
        check: (user) => user.level >= 10
    },
    {
        id: 'centurion',
        title: 'Kolektor EXP',
        desc: 'Kumpulkan total 500 XP.',
        icon: 'sparkles',
        emoji: '💎',
        check: (user) => user.totalExp >= 500
    },
    {
        id: 'first_saving',
        title: 'Penabung Pemula',
        desc: 'Membuat target tabungan pertama.',
        icon: 'piggy-bank',
        emoji: '🐷',
        check: (user, history, state) => state && state.savings && state.savings.length > 0
    },
    {
        id: 'saving_goal',
        title: 'Target Tercapai',
        desc: 'Berhasil mencapai 1 target tabungan penuh.',
        icon: 'check-circle',
        emoji: '🏆',
        check: (user, history, state) => state && state.savings && state.savings.some(s => s.status === 'completed')
    }
];

export const TITLES = [
    { level: 1, title: 'Chronos Initiate', rank: 'Pemula' },
    { level: 2, title: 'Time Weaver', rank: 'Konsisten' },
    { level: 3, title: 'Chronomancer', rank: 'Pengendali Waktu' },
    { level: 5, title: 'Pengawal Ritme Waktu', rank: 'Disiplin' },
    { level: 8, title: 'Chrono Crusader', rank: 'Mahir' },
    { level: 10, title: 'Master of Hours', rank: 'Master' },
    { level: 15, title: 'Grand Chronomancer', rank: 'Legenda' }
];

export class GamificationEngine {
    constructor(store) {
        this.store = store;
        this.audioCtx = null;
    }

    /**
     * Required EXP to reach the next level from level L
     * Formula: 100 * (Level ^ 1.5)
     */
    getExpForLevel(level) {
        return Math.round(100 * Math.pow(level, 1.5));
    }

    /**
     * Process level up checking and badge evaluation
     */
    evaluateProgression() {
        const state = this.store.getState();
        let user = { ...state.user };
        let leveledUp = false;
        let newBadges = [];

        // Check Level Ups
        let nextExpReq = this.getExpForLevel(user.level);
        while (user.currentExp >= nextExpReq) {
            user.currentExp -= nextExpReq;
            user.level += 1;
            leveledUp = true;
            nextExpReq = this.getExpForLevel(user.level);

            // Update title based on level
            const eligibleTitle = TITLES.filter(t => user.level >= t.level).pop();
            if (eligibleTitle && eligibleTitle.title !== user.title) {
                user.title = eligibleTitle.title;
                if (!user.unlockedTitles.includes(eligibleTitle.title)) {
                    user.unlockedTitles.push(eligibleTitle.title);
                }
            }
        }

        // Check Badges
        BADGES.forEach(badge => {
            if (!user.unlockedBadges.includes(badge.id)) {
                if (badge.check(user, state.history, state)) {
                    user.unlockedBadges.push(badge.id);
                    newBadges.push(badge);
                }
            }
        });

        if (leveledUp || newBadges.length > 0) {
            this.store.updateUser(user);
        }

        return { leveledUp, newBadges, currentLevel: user.level, title: user.title };
    }

    /**
     * Web Audio API Synthesizer for UI sound effects
     */
    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
    }

    playSound(type) {
        const state = this.store.getState();
        if (!state.user.soundEnabled) return;

        try {
            this.initAudio();
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            if (type === 'complete') {
                // Happy high chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
                osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);

            } else if (type === 'levelup') {
                // Epic fanfare synth
                const notes = [440, 554.37, 659.25, 880];
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + (idx * 0.08));
                    
                    gain.gain.setValueAtTime(0.2, now + (idx * 0.08));
                    gain.gain.exponentialRampToValueAtTime(0.01, now + (idx * 0.08) + 0.4);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + (idx * 0.08));
                    osc.stop(now + (idx * 0.08) + 0.45);
                });

            } else if (type === 'click') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            }
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }
}
