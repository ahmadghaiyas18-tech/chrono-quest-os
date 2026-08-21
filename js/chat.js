/**
 * ChronoQuest OS — Gemini AI Coach & Chat System
 * Client communicates purely with Node.js backend proxy (/api/ask-gemini).
 */

export class GeminiChatManager {
    constructor(store, gamification) {
        this.store = store;
        this.gamification = gamification;
        this.isLoading = false;
    }

    /**
     * Build contextual system prompt with current user state
     */
    buildContext() {
        const state = this.store.getState();
        const user = state.user;
        const todayQuests = state.quests.map(q => {
            const isDone = q.completedDates.includes(this.store.getJakartaDateKey());
            return `- [${isDone ? 'SELESAI' : 'BELUM'}] ${q.title} (${q.category}, ${q.difficulty}, ${q.exp} XP)`;
        }).join('\n');

        const savingsData = (state.savings || []).map(s => {
            const total = s.deposits.reduce((sum, d) => sum + d.amount, 0);
            return `- [${s.status.toUpperCase()}] ${s.title}: Terkumpul Rp${total} / Target Rp${s.targetAmount} (Deadline: ${s.deadline || 'Tidak ada'})`;
        }).join('\n');

        return `Kamu adalah Asisten Aktivitas & Tabungan, konsultan produktivitas dan keuangan yang bijak dan berjiwa gamifikasi RPG di ChronoQuest OS.
Zona Waktu Pengguna: Asia/Jakarta (WIB).

Status Pengguna:
- Nama: ${user.name} | Level: ${user.level} (${user.title}) | EXP: ${user.currentExp} | Streak: ${user.streak} Hari

Daftar Quest Hari Ini:
${todayQuests || 'Belum ada quest hari ini.'}

Status Tabungan Saat Ini:
${savingsData || 'Belum ada target tabungan.'}

Instruksi:
- Bersikaplah sebagai konsultan keuangan yang logis, edukatif, namun tetap menggunakan tema RPG yang seru.
- Jika pengguna terlambat dari target tabungan (berdasarkan deadline dan dana terkumpul), berikan perhitungan matematis yang solutif (misal: sisa dana dibagi sisa hari).
- Selalu berikan saran spesifik, proaktif memotivasi, dan fokus pada solusi penyelesaian.
- Jawab dengan ringkas dan akurat menggunakan data riwayat di atas tanpa memalsukan angka.`;
    }

    /**
     * Send message to backend Gemini API endpoint
     */
    async sendMessage(userMessage) {
        if (!userMessage.trim() || this.isLoading) return null;

        // Disable input to prevent double submit
        const sendBtn = document.getElementById('sendChatBtn');
        if (sendBtn) sendBtn.disabled = true;

        this.isLoading = true;
        this.store.addChatMessage('user', userMessage);

        const systemContext = this.buildContext();
        const fullPrompt = systemContext + '\n\nPertanyaan pengguna: ' + userMessage;

        try {
            // Send request to backend endpoint
            const endpoint = (window.location.port === '3000' || window.location.origin.includes('localhost:3000'))
                ? '/api/ask-gemini'
                : 'http://localhost:3000/api/ask-gemini';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: fullPrompt
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            const replyText = data.answer || data.text || 'Maaf, saya tidak dapat merespons saat ini.';

            const botMsg = this.store.addChatMessage('assistant', replyText);
            this.isLoading = false;
            if (sendBtn) sendBtn.disabled = false;
            return botMsg;

        } catch (error) {
            console.error('Gemini Backend Request Error:', error);
            const errorMsg = this.store.addChatMessage(
                'assistant',
                `⚠️ *Pesan dari AI*: Gagal menghubungi backend (${error.message}). Pastikan server backend Node.js berjalan di port 3000 (jalankan \`npm start\`) dan file .env memiliki \`GEMINI_API_KEY\`.`
            );
            this.isLoading = false;
            if (sendBtn) sendBtn.disabled = false;
            return errorMsg;
        }
    }
}
