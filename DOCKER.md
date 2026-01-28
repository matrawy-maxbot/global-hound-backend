# Docker Setup للمنصة الخلفية

🐳 دليل شامل لإعداد وتشغيل جميع خدمات المنصة الخلفية باستخدام Docker Compose.

## 📋 الخدمات المتضمنة

- **PostgreSQL**: قاعدة البيانات الرئيسية
- **MongoDB**: قاعدة بيانات NoSQL
- **Redis**: التخزين المؤقت والجلسات
- **RedisInsight**: واجهة ويب لإدارة Redis

## 🚀 التشغيل السريع

### 1. تشغيل جميع الخدمات
```bash
docker-compose up -d
```

### 2. التحقق من حالة الخدمات
```bash
docker-compose ps
```

### 3. عرض السجلات
```bash
# جميع الخدمات
docker-compose logs -f

# خدمة محددة
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis
```

## 🔧 إعدادات الاتصال

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: backend_db
- **Username**: postgres
- **Password**: password123

### MongoDB
- **Host**: localhost
- **Port**: 27017
- **Database**: backend_db
- **Username**: backend_user
- **Password**: backend_pass
- **Root User**: admin
- **Root Password**: adminpass

### Redis
- **Host**: localhost
- **Port**: 6379
- **Password**: redis_backend_pass
- **Database**: 0

### RedisInsight
- **URL**: http://localhost:5540
- **Redis Connection**: localhost:6379 (password: redis_backend_pass)

## 📊 إدارة الخدمات

### تشغيل خدمة واحدة
```bash
docker-compose up -d postgres
docker-compose up -d mongodb
docker-compose up -d redis
```

### إيقاف الخدمات
```bash
# إيقاف جميع الخدمات
docker-compose down

# إيقاف مع حذف البيانات
docker-compose down -v
```

### إعادة تشغيل خدمة
```bash
docker-compose restart postgres
docker-compose restart mongodb
docker-compose restart redis
```

## 🔍 فحص الصحة

جميع الخدمات تتضمن فحوصات صحة تلقائية:

### PostgreSQL
```bash
docker-compose exec postgres pg_isready -U postgres
```

### MongoDB
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Redis
```bash
docker-compose exec redis redis-cli -a redis_backend_pass ping
```

## 💾 إدارة البيانات

### النسخ الاحتياطي

#### PostgreSQL
```bash
docker-compose exec postgres pg_dump -U postgres backend_db > backup_postgres.sql
```

#### MongoDB
```bash
docker-compose exec mongodb mongodump --db backend_db --out /tmp/backup
docker cp mongodb_backend:/tmp/backup ./backup_mongodb
```

#### Redis
```bash
docker-compose exec redis redis-cli -a redis_backend_pass BGSAVE
```

### الاستعادة

#### PostgreSQL
```bash
docker-compose exec -T postgres psql -U postgres backend_db < backup_postgres.sql
```

#### MongoDB
```bash
docker cp ./backup_mongodb mongodb_backend:/tmp/restore
docker-compose exec mongodb mongorestore --db backend_db /tmp/restore/backend_db
```

## 🛠️ استكشاف الأخطاء

### مشاكل شائعة

#### المنافذ مستخدمة
```bash
# التحقق من المنافذ المستخدمة
netstat -tulpn | grep :5432
netstat -tulpn | grep :27017
netstat -tulpn | grep :6379
```

#### مشاكل الأذونات
```bash
# إعادة تعيين أذونات المجلدات
sudo chown -R $USER:$USER ./data
```

#### مشاكل الذاكرة
```bash
# زيادة حد الذاكرة لـ Docker
# في Docker Desktop: Settings > Resources > Memory
```

### عرض استخدام الموارد
```bash
docker stats
```

## 🔧 التخصيص

### تغيير كلمات المرور
1. عدّل ملف `.env.docker`
2. أعد تشغيل الخدمات:
```bash
docker-compose down
docker-compose up -d
```

### تغيير المنافذ
عدّل المنافذ في `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # PostgreSQL على منفذ 5433
  - "27018:27017" # MongoDB على منفذ 27018
  - "6380:6379"   # Redis على منفذ 6380
```

## 📈 المراقبة

### عرض السجلات المباشرة
```bash
# جميع الخدمات
docker-compose logs -f --tail=100

# خدمة محددة مع الوقت
docker-compose logs -f -t postgres
```

### مراقبة الأداء
```bash
# استخدام الموارد
docker-compose top

# إحصائيات مفصلة
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

## 🔒 الأمان

### أفضل الممارسات
1. **غيّر كلمات المرور الافتراضية**
2. **استخدم شبكة Docker منفصلة**
3. **قيّد الوصول للمنافذ**
4. **فعّل SSL/TLS في الإنتاج**

### تشفير الاتصالات
للإنتاج، أضف شهادات SSL:
```yaml
volumes:
  - ./certs:/etc/ssl/certs:ro
```

## 🚀 الإنتاج

### ملف docker-compose.prod.yml
```yaml
version: '3.8'
services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

### تشغيل في الإنتاج
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📞 الدعم

في حالة مواجهة مشاكل:
1. تحقق من السجلات: `docker-compose logs`
2. تحقق من حالة الخدمات: `docker-compose ps`
3. أعد تشغيل الخدمات: `docker-compose restart`
4. في الحالات الصعبة: `docker-compose down && docker-compose up -d`

---

💡 **نصيحة**: استخدم `docker-compose up -d` لتشغيل الخدمات في الخلفية، و `docker-compose down` لإيقافها بأمان.