/* مزامنة المحتوى إلى Firebase: node scripts/push-firebase.mjs */
import { pushToFirebase } from "../src/firebasePush.js";

try {
  const stats = await pushToFirebase();
  console.log("تمت المزامنة إلى Firebase:");
  console.log(`  أشرطة: ${stats.audios}`);
  console.log(`  علماء: ${stats.scholars}`);
  console.log(`  تصنيفات: ${stats.categories}`);
  console.log(`  سلاسل: ${stats.series}`);
} catch (e) {
  console.error("فشلت المزامنة:", e.message);
  process.exit(1);
}
