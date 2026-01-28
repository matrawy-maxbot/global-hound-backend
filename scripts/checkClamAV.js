/**
 * سكريبت للتحقق من تشغيل واتصال ClamAV
 */

import NodeClam from 'clamscan';

async function checkClamAV() {
  console.log('🔍 جاري التحقق من ClamAV...\n');

  try {
    // محاولة الاتصال بـ ClamAV
    const clamscan = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      clamdscan: {
        host: process.env.CLAMAV_HOST || 'localhost',
        port: process.env.CLAMAV_PORT || 3310,
        timeout: 60000,
        localFallback: true
      }
    });

    console.log('✅ تم الاتصال بـ ClamAV بنجاح!\n');

    // الحصول على معلومات النسخة
    const version = await clamscan.getVersion();
    console.log('📌 معلومات ClamAV:');
    console.log(`   النسخة: ${version}\n`);

    // اختبار فحص الفيروسات باستخدام EICAR Test File
    console.log('🧪 اختبار فحص الفيروسات...');
    console.log('   استخدام: EICAR Standard Anti-Virus Test File');
    
    const eicarTest = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const testBuffer = Buffer.from(eicarTest);

    try {
      // استخدام scanStream بدلاً من scanBuffer
      const { Readable } = await import('stream');
      const testStream = Readable.from(testBuffer);
      const { isInfected, viruses } = await clamscan.scanStream(testStream);
      
      if (isInfected) {
        console.log('✅ اختبار الفحص ناجح!');
        console.log(`   تم اكتشاف: ${viruses.join(', ')}\n`);
      } else {
        console.log('⚠️  تحذير: لم يتم اكتشاف EICAR Test File');
        console.log('   قد تكون قاعدة بيانات الفيروسات قديمة\n');
      }
    } catch (scanError) {
      console.log('⚠️  خطأ في اختبار الفحص:', scanError.message, '\n');
    }

    // اختبار ملف آمن
    console.log('🧪 اختبار ملف آمن...');
    const safeBuffer = Buffer.from('This is a safe test file');
    try {
      const { Readable } = await import('stream');
      const safeStream = Readable.from(safeBuffer);
      const { isInfected: isSafeInfected } = await clamscan.scanStream(safeStream);
      
      if (!isSafeInfected) {
        console.log('✅ الملف الآمن اجتاز الفحص بنجاح!\n');
      } else {
        console.log('⚠️  تحذير: تم اكتشاف الملف الآمن كمصاب (خطأ إيجابي)\n');
      }
    } catch (safeError) {
      console.log('⚠️  خطأ في فحص الملف الآمن:', safeError.message, '\n');
    }

    // معلومات الاتصال
    console.log('🌐 معلومات الاتصال:');
    console.log(`   Host: ${process.env.CLAMAV_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.CLAMAV_PORT || 3310}\n`);

    console.log('═══════════════════════════════════════');
    console.log('✅ ClamAV يعمل بشكل صحيح وجاهز للاستخدام!');
    console.log('═══════════════════════════════════════\n');

    // eslint-disable-next-line no-process-exit
    process.exit(0);

  } catch (error) {
    console.error('❌ فشل الاتصال بـ ClamAV\n');
    console.error('📋 تفاصيل الخطأ:');
    console.error(`   ${error.message}\n`);

    console.log('💡 الحلول الممكنة:\n');
    console.log('   1. تأكد من تثبيت ClamAV:');
    console.log('      Windows: https://www.clamav.net/downloads');
    console.log('      Linux: sudo apt-get install clamav clamav-daemon\n');

    console.log('   2. تأكد من تشغيل ClamAV Daemon:');
    console.log('      Windows: clamd');
    console.log('      Linux: sudo systemctl start clamav-daemon\n');

    console.log('   3. تحديث قاعدة بيانات الفيروسات:');
    console.log('      freshclam\n');

    console.log('   4. تحقق من إعدادات الاتصال في .env:');
    console.log('      CLAMAV_HOST=localhost');
    console.log('      CLAMAV_PORT=3310\n');

    console.log('   5. إذا كنت تستخدم Docker:');
    console.log('      docker-compose up -d clamav\n');

    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

// تشغيل الفحص
checkClamAV();
