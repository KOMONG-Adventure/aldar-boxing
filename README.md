# ALDAR Boxing Club

Боксын клубын удирдлагын веб апп. Одоогийн хөгжүүлэлт: эхний ээлжинд сурагчийн бүртгэл болон профайл зураг Supabase-д хадгалах, Vercel дээр дизайн сайжруулах.

## Нэгдүгээр үе шат

- Сурагч нэмэх, хайх, мэдээлэл засах, устгах.
- Асран хамгаалагчийг 2 баганаар бүртгэх, нэмсэн хэсгийг хасах.
- Профайл зураг оруулах, камераар авах, урьдчилан харах, солих, хасах.
- Бүртгэл `public.students` хүснэгтэд, зураг private `student-photos` bucket-д хадгалагдана.
- Зургийг серверээс хугацаатай signed URL-аар дуудна. Secret key браузерт очихгүй.

`data.json` ашиглахгүй. Ирц, хуваарь, санхүү, төлбөр/тулааны түүх, тохиргооны хадгалалтыг дараагийн үе шатанд холбоно. Эдгээрийн UI одоогоор дизайны загвар; хадгалалтын API нь алдаа буцаана. Жишээ сурагчийн өгөгдөл автоматаар үүсгэхгүй.

## Баримтжуулалт

- [Supabase ба Vercel тохиргоо](docs/SUPABASE-SETUP.md)
- [UI/UX аудит, дизайны төлөвлөгөө](docs/UI-UX-PLAN.md) — анхны кодод хийсэн аудит; одоогийн шатны хүрээг энэ README тодорхойлно.

## Технологи

Next.js 16.4.3, React 19.3.0, TypeScript, Tailwind CSS 4, Supabase JS 2.119.0.

```text
src/components/AddMemberModal.tsx   Бүртгэл, зураг сонголт
src/app/api/members/route.ts        Сурагчийн API
src/lib/student-data.ts            Supabase CRUD, зураг upload/read/delete
src/lib/student-fields.ts          Хүснэгт ба UI талбарын mapping
src/lib/supabase/server.ts         Серверийн Supabase client
src/lib/db.ts                      Нийтлэг төрөл, дараагийн модулийн хоосон төлөв
supabase/migrations/               Хэрэгжсэн schema
```

## Тохиргоо ба шалгалт

`.env.example`-ийн дагуу `SUPABASE_URL`, `SUPABASE_SECRET_KEY`-г локал `.env.local` эсвэл Vercel Environment Variables-д тохируулна. Нууц түлхүүрийг git-д оруулахгүй.

```bash
npm ci
node --experimental-strip-types --test tests/student-fields.test.mjs
npx tsc --noEmit
npm run build
```

Node.js 22.18+ ашиглана. Одоогийн ажлын үндсэн preview нь Vercel. Localhost сервер хэрэглэгчийн хүсэлтээр унтраалттай; шаардлагатай үед `npm run dev` ажиллуулж болно.

Next.js код бичихээс өмнө [AGENTS.md](AGENTS.md)-ийн дагуу `node_modules/next/dist/docs/`-ийн холбогдох гарын авлагыг уншина.

## Цаашдын дараалал

Сурагчийн бүртгэл/зураг → хуваарь/ирц → төлбөр/санхүү → бусад модуль → Android APK. Mobile-first дизайн, device camera болон safe-area шаардлагыг дизайны үеэс тооцно.
