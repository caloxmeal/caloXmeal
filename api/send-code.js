import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Sadece formdan gelen POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hatalı istek türü.' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Lütfen bir e-posta adresi girin.' });
  }

  // 6 haneli rastgele bir doğrulama kodu oluştur
  const dogrulamaKodu = Math.floor(100000 + Math.random() * 900000);

  try {
    // Mail gönderme motorunu kuruyoruz (Nodemailer)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Vercel'e gireceğimiz Gmail adresi
        pass: process.env.EMAIL_PASS  // Vercel'e gireceğimiz Gmail Uygulama Şifresi
      }
    });

    // Gönderilecek mailin içeriği
    const mailOptions = {
      from: `"CaloXmeal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'CaloXmeal Doğrulama Kodunuz',
      text: `Merhaba, \n\nCaloXmeal kayıt işleminiz için 6 haneli doğrulama kodunuz: ${dogrulamaKodu}\n\nLütfen bu kodu ekrandaki alana giriniz.`
    };

    // Maili ateşle
    await transporter.sendMail(mailOptions);

    // Siteye 'başarılı' mesajı ve frontend'in çalışması için kodu geri gönder
    return res.status(200).json({
      success: true,
      mesaj: 'Doğrulama kodu e-postanıza gönderildi!',
      testKodu: dogrulamaKodu 
    });

  } catch (error) {
    console.error("Mail gönderme hatası:", error);
    return res.status(500).json({ error: 'Mail işlemi sırasında bir hata oluştu.' });
  }
}
