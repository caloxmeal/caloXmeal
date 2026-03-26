export default async function handler(req, res) {
  // Sadece formdan gelen POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hatalı istek türü.' });
  }

  // Kullanıcının girdiği e-postayı al
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Lütfen bir e-posta adresi girin.' });
  }

  // 6 haneli rastgele bir doğrulama kodu oluştur (Örn: 482910)
  const dogrulamaKodu = Math.floor(100000 + Math.random() * 900000);

  try {
    // NOT: Gerçek mail gönderme ayarlarını (Gmail vb.) bir sonraki adımda buraya ekleyeceğiz.
    // Şimdilik sistemin hata vermeden çalıştığını test ediyoruz.
    console.log(`Şu maile kod gönderilecek: ${email} | Kod: ${dogrulamaKodu}`);

    // Siteye 'başarılı' mesajı gönder
    return res.status(200).json({
      success: true,
      mesaj: 'Doğrulama kodu e-postanıza gönderildi!',
      testKodu: dogrulamaKodu // Geçici olarak test için kodu geri gönderiyoruz
    });

  } catch (error) {
    return res.status(500).json({ error: 'Mail işlemi sırasında bir hata oluştu.' });
  }
}
