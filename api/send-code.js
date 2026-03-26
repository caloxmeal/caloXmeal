import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hatalı istek türü.' });
  }

  const { email, codeToVerify, hash } = req.body;
  const secret = process.env.EMAIL_PASS || 'caloxmeal_gizli_anahtar'; // Güvenlik için ortam değişkenini kullanıyoruz

  // --- 1. AŞAMA: KOD DOĞRULAMA (Kullanıcı kodu ekrana girdiğinde çalışır) ---
  if (codeToVerify && hash) {
    // Gelen e-posta ve kodla aynı şifrelemeyi tekrar yapıyoruz
    const expectedHash = crypto.createHmac('sha256', secret).update(email + codeToVerify).digest('hex');
    
    if (expectedHash === hash) {
      return res.status(200).json({ success: true, mesaj: 'Kod doğrulandı!' });
    } else {
      return res.status(400).json({ error: 'Hatalı kod girdiniz.' });
    }
  }

  // --- 2. AŞAMA: KOD GÖNDERME (Kullanıcı e-posta adresini yazdığında çalışır) ---
  if (!email) {
    return res.status(400).json({ error: 'Lütfen bir e-posta adresi girin.' });
  }

  const dogrulamaKodu = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Kodu ve e-postayı birleştirip şifreliyoruz (Frontend kodu asla göremez)
  const newHash = crypto.createHmac('sha256', secret).update(email + dogrulamaKodu).digest('hex');

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
      }
    });

    const mailOptions = {
      from: `"CaloXmeal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'CaloXmeal Doğrulama Kodunuz',
      text: `Merhaba, \n\nCaloXmeal kayıt işleminiz için 6 haneli doğrulama kodunuz: ${dogrulamaKodu}\n\nLütfen bu kodu ekrandaki alana giriniz.`
    };

    await transporter.sendMail(mailOptions);

    // Siteye 'başarılı' mesajı ve sadece şifrelenmiş HASH kodunu geri gönder
    return res.status(200).json({
      success: true,
      mesaj: 'Doğrulama kodu e-postanıza gönderildi!',
      hash: newHash 
    });

  } catch (error) {
    console.error("Mail gönderme hatası:", error);
    return res.status(500).json({ error: 'Mail işlemi sırasında bir hata oluştu.' });
  }
}
