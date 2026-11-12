# Supabase + Vercel: эхний үе шат

Төсөл: [aldar-boxing](https://supabase.com/dashboard/project/hoecthdccnojjbxoamwh).

## Хамрах хүрээ

- `public.students`: сурагчийн хувийн мэдээлэл, асран хамгаалагч, бүртгэлийн анхны төлбөрийн төлөв/огноо, зургийн object path.
- Private `student-photos` bucket: JPG/PNG/WebP, 5 МБ хязгаар.
- Браузер → `/api/members` → серверийн Supabase client.
- Зураг уншихад 1 цагийн signed URL үүсгэнэ. Удаан нээлттэй байсан бол refresh хийж шинэ URL авна.
- Зураггүй үед initials placeholder харагдана. Зураг солих/сурагч устгахад хуучин object-ийг цэвэрлэнэ. Cleanup алдааг серверт логлоно.
- RLS идэвхтэй; anon/authenticated-д хүснэгтийн эрх олгоогүй. Зөвхөн серверийн Secret key ашиглана. Policy байхгүй гэсэн advisor INFO нь зориудын server-only загвар.

`data.json` унших/бичихгүй. Хуучин сурагчдыг автоматаар импортлохгүй. Ирц, хуваарь, санхүү, дэлгэрэнгүй төлбөр/тулааны түүх, тохиргоог дараагийн үе шатанд холбоно. Эдгээрийн өгөгдөл одоогоор хоосон, хадгалалт амжилттай мэт хариулахгүй.

## Серверийн тохиргоо

[Supabase API keys](https://supabase.com/dashboard/project/hoecthdccnojjbxoamwh/settings/api-keys)-ээс Secret key авч дараах server-only хувьсагчийг тохируулна:

```dotenv
SUPABASE_URL=https://hoecthdccnojjbxoamwh.supabase.co
SUPABASE_SECRET_KEY=your-server-secret
```

Локал орчинд `.env.local`; Vercel дээр төслийн Environment Variables ашиглана. Түлхүүрийг чат, git, `NEXT_PUBLIC_` хувьсагчид оруулахгүй. Тохируулсны дараа redeploy хийнэ. Түлхүүр байхгүй үед API алдаа буцааж, UI холболтын алдааг харуулна; локал fallback хийхгүй.

Schema: `supabase/migrations/20261112114604_create_student_registration.sql`. Шинэ төсөлд аль хэдийн MCP migration-аар хэрэгжсэн тул давхар ажиллуулахгүй.

## Vercel workflow

Зориулсан төсөл: `infokomong-gmailcoms-projects/boxing-club-app`.

Код өөрчлөх → тест/build → GitHub main руу push → Vercel Git integration deploy → build status/URL шалгах. Git integration main салбарт холбогдсон эсэхийг Vercel access сэргэсний дараа шалгана.

Deployment бүрийн hash URL өөрчлөгдөнө. Өмнөх hash URL дээр шинэ build автоматаар солигдохгүй; тогтмол project domain эсвэл branch alias ашиглана.

Өөрчлөлтүүдэд бодит сурагчийн data.json, .env.local, нөөц файл орохгүй. `.vercelignore` deployment-д эдгээрийг оруулахгүй.

Одоогийн апп хэрэглэгчийн нэвтрэлтгүй тул бодит сурагчтай preview-г Vercel Authentication хамгаалалттай байлгана. Public production-д API authorization хэрэгжүүлэх шаардлагатай.

## Баталгаажуулалт

```bash
node --experimental-strip-types --test tests/student-fields.test.mjs
npx tsc --noEmit
npm run build
```

Mapping тестүүд нь bucket path хадгалалт, кирилл/асран хамгаалагч, cloud-only өгөгдлийн хувиргалтыг шалгана. Бодит upload/read/delete урсгалыг серверийн key тохируулсны дараа тусад нь шалгана. Database кирилл/JSONB бичих-унших probe амжилттай, probe мөрийг цэвэрлэсэн.

Эх сурвалж: [Storage uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [Signed URL](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [API keys](https://supabase.com/docs/guides/api/api-keys).
