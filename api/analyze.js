// api/analyze.js
// CaloXmeal — AI Analysis Endpoint (GPT-4o-mini Integrated for Cost Efficiency)
// ─────────────────────────────────────────────────────────

// Ön yüzden gelen Base64 resimlerin boyut sınırına takılmasını önlemek için limit artırıldı.
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb', 
        },
    },
};

const ALLOWED_MODES = ['yemek', 'spor', 'lara'];

const buildPrompt = (mode, user_data, lang) => {
    const langRule = lang === 'en' 
        ? 'RESPONSE LANGUAGE: ENGLISH ONLY.' 
        : 'YANIT DİLİ: YALNIZCA TÜRKÇE.';

    if (mode === 'spor') {
        return {
            system: `Sen profesyonel bir fitness koçusun. 
            Kullanıcı profili ve istekleri: ${user_data}. 
            KURALLAR:
            - Kullanıcı haftada kaç gün seçtiyse (örn: 4 gün) SADECE o kadar gün için program yaz.
            - Her gün için hareket, set ve tekrar ver.
            - Programın en sonuna "BU HAFTA TAHMİNİ YAKILACAK KALORİ: XXX kcal" şeklinde bir hesaplama ekle.
            - Format çok düzenli, estetik ve motive edici olsun.
            ${langRule}`,
            user: "Bana özel spor programımı hazırla.",
        };
    }

    if (mode === 'lara') {
        return {
            system: `Senin adın Lara. CaloXmeal uygulamasının yapay zeka diyetisyenisin.
            KURALLAR:
            - Cevapların can alıcı, çok kısa, arkadaş canlısı ve net olsun. Gereksiz uzun cümlelerden kaçın.
            - Sadece diyet, spor, besin değerleri ve sağlıklı yaşam hakkında konuş.
            - Bu konular dışındaki sorulara nazikçe reddederek sadece uzmanlık alanında cevap verebileceğini söyle.
            ${langRule}`,
            user: user_data,
        };
    }

    // YEMEK ANALİZ MODU
    return {
        system: `Sen kıdemli bir gıda bilimcisi ve klinik diyetisyensin.
        Kullanıcının Özel Talimatları: ${user_data}

        KURALLAR:
        - Görüntüdeki insanları veya nesneleri tamamen yoksay. Sadece gıdaya odaklan.
        - Hiçbir önsöz veya giriş cümlesi kullanma. Doğrudan "1. YEMEK ADI:" diyerek başla.
        - Aşağıdaki 5 bölümü SIRA İLE, rakamlarla numaralandırarak eksiksiz yaz. Başka format kullanma.

        FORMAT (Sıralama ve numaralandırma kritiktir):
        1. YEMEK ADI: Gıdanın tam adı.
        2. BESİN DEĞERLERİ: Kullanıcının talimatında belirttiği gibi TAM OLARAK şu formatta yaz: Protein: X, Karbonhidrat: X, Yağ: X, Kalori: X (X yerine sadece tahmini sayıları yaz, "g" veya "kcal" ekleme).
        3. NET TAVSİYE: Tüketim onayı/reddi ve kullanıcı hedefine göre can alıcı tavsiye (1-2 cümle).
        4. ÜRÜN ÖZETİ: İçerik ve hazırlanış tarzı hakkında kısa, profesyonel bir özet.
        5. HEDEF UYUM SKORU: Sadece "[SKOR: X]" yaz (X = 1-10 arası tam sayı).

        ${langRule}`,
        user: [
            {
                type: 'text',
                text: lang === 'en' 
                    ? 'Analyze the food in the image strictly following the 5-section format.' 
                    : 'Görüntüdeki gıdayı analiz et. 5 bölümlük formata kesinlikle uy.',
            },
            {
                type: 'image_url',
                image_url: { url: '{IMAGE}', detail: 'low' },
            },
        ],
    };
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { image, user_data, mode, lang = 'tr' } = req.body ?? {};

    if (!ALLOWED_MODES.includes(mode)) return res.status(400).json({ error: 'Geçersiz mod.' });
    if (!user_data) return res.status(400).json({ error: 'Veri eksik.' });

    try {
        const prompt = buildPrompt(mode, user_data, lang);
        
        // Görseli prompt içine yerleştirme (Sadece yemek modunda var)
        const userContent = mode === 'yemek' 
            ? prompt.user.map(b => 
                b.type === 'image_url' 
                    ? { ...b, image_url: { ...b.image_url, url: image } } 
                    : b
              )
            : prompt.user;

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // MALİYETİ DÜŞÜRMEK İÇİN MODEL BURADA DEĞİŞTİRİLDİ
                max_tokens: 1000,
                temperature: 0.3,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: userContent },
                ],
            }),
        });

        if (!openaiRes.ok) {
            const errData = await openaiRes.json();
            console.error('[OpenAI API Hatası]:', errData);
            return res.status(502).json({ error: 'Yapay zeka servisi yanıt vermedi veya isteği reddetti.' });
        }

        const data = await openaiRes.json();
        const analysis = data?.choices?.[0]?.message?.content?.trim();

        if (!analysis) {
            return res.status(502).json({ error: 'Analiz sonucu alınamadı.' });
        }

        return res.status(200).json({ analysis });

    } catch (err) {
        console.error('[CaloXmeal] Sistem hatası:', err);
        return res.status(500).json({ error: 'Sistem hatası.' });
    }
}
